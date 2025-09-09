const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

class CompetitorAnalyzer {
  constructor() {
    this.competitors = {
      braze: {
        name: 'Braze',
        url: 'https://www.braze.com/docs/help/release_notes',
        selector: '.release-note, .changelog-entry, [data-testid="release-note"], .content-section',
        fallbackSelectors: ['article', '.markdown-body', '.content', 'main']
      },
      iterable: {
        name: 'Iterable',
        url: 'https://support.iterable.com/hc/en-us/articles/33302033277332-2025-Release-Notes',
        selector: '.article-body, .article-content, .zendesk-article',
        fallbackSelectors: ['.article-body', 'article', '.content', 'main']
      },
      klaviyo: {
        name: 'Klaviyo',
        url: 'https://www.klaviyo.com/whats-new',
        selector: '.whats-new-item, .update-card, .release-item',
        fallbackSelectors: ['.card', '.update', 'article', '.content', 'main']
      }
    };
    
    this.results = [];
    this.outputDir = 'competitor-analysis-results';
  }

  async initialize() {
    // Create output directory
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    } catch (error) {
      console.error('Error creating directory:', error);
    }
  }

  async launchBrowser() {
    console.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  async scrapeCompetitor(competitorKey) {
    const competitor = this.competitors[competitorKey];
    console.log(`\n🔍 Analyzing ${competitor.name}...`);
    console.log(`📄 URL: ${competitor.url}`);

    const page = await this.browser.newPage();
    
    try {
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Navigate to page with timeout
      await page.goto(competitor.url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      // Wait a bit for dynamic content
      await page.waitForTimeout(3000);

      // Try to find content with multiple selectors
      let content = null;
      const selectors = [competitor.selector, ...competitor.fallbackSelectors];

      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`✅ Found content with selector: ${selector}`);
            content = await this.extractContentFromElements(page, elements);
            break;
          }
        } catch (error) {
          console.log(`❌ Selector failed: ${selector}`);
        }
      }

      // If no specific selectors work, get general page content
      if (!content || content.length === 0) {
        console.log('⚠️  Using fallback: extracting general page content');
        content = await this.extractGeneralContent(page);
      }

      // Process and clean content
      const processedContent = this.processContent(content, competitor.name);
      
      console.log(`📊 Extracted ${processedContent.length} items from ${competitor.name}`);
      
      return {
        competitor: competitor.name,
        url: competitor.url,
        scrapedAt: new Date().toISOString(),
        itemCount: processedContent.length,
        items: processedContent
      };

    } catch (error) {
      console.error(`❌ Error scraping ${competitor.name}:`, error.message);
      return {
        competitor: competitor.name,
        url: competitor.url,
        scrapedAt: new Date().toISOString(),
        error: error.message,
        itemCount: 0,
        items: []
      };
    } finally {
      await page.close();
    }
  }

  async extractContentFromElements(page, elements) {
    const content = [];
    
    for (let i = 0; i < Math.min(elements.length, 20); i++) {
      try {
        const item = await page.evaluate(el => {
          return {
            text: el.innerText?.trim() || '',
            html: el.innerHTML?.substring(0, 1000) || '', // Limit HTML size
            tagName: el.tagName,
            className: el.className
          };
        }, elements[i]);
        
        if (item.text && item.text.length > 20) {
          content.push(item);
        }
      } catch (error) {
        console.log(`Warning: Could not extract from element ${i}`);
      }
    }
    
    return content;
  }

  async extractGeneralContent(page) {
    return await page.evaluate(() => {
      const content = [];
      
      // Look for common content containers
      const containers = document.querySelectorAll('article, .content, main, .post, .update, .release');
      
      containers.forEach(container => {
        const text = container.innerText?.trim();
        if (text && text.length > 50) {
          content.push({
            text: text.substring(0, 2000), // Limit text size
            html: container.innerHTML?.substring(0, 1000),
            tagName: container.tagName,
            className: container.className
          });
        }
      });
      
      return content;
    });
  }

  processContent(rawContent, competitorName) {
    const processed = [];
    const seenTexts = new Set();

    rawContent.forEach((item, index) => {
      const text = item.text.trim();
      
      // Skip duplicates and very short content
      if (text.length < 30 || seenTexts.has(text.substring(0, 100))) {
        return;
      }
      
      seenTexts.add(text.substring(0, 100));

      // Extract potential dates
      const dateMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i) ||
                       text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/) ||
                       text.match(/\b\d{4}-\d{2}-\d{2}\b/);

      // Look for feature/update keywords
      const isUpdate = /\b(new|update|release|feature|improvement|launch|announce|version|fix|enhancement)\b/i.test(text);
      
      processed.push({
        id: `${competitorName.toLowerCase()}_${index}`,
        competitor: competitorName,
        title: this.extractTitle(text),
        content: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
        fullContent: text,
        extractedDate: dateMatch ? dateMatch[0] : null,
        isLikelyUpdate: isUpdate,
        contentLength: text.length,
        extractedAt: new Date().toISOString()
      });
    });

    return processed.sort((a, b) => {
      // Sort by likely updates first, then by content length
      if (a.isLikelyUpdate && !b.isLikelyUpdate) return -1;
      if (!a.isLikelyUpdate && b.isLikelyUpdate) return 1;
      return b.contentLength - a.contentLength;
    });
  }

  extractTitle(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return 'No title';
    
    // Take first line as title, limit length
    const title = lines[0].trim();
    return title.length > 100 ? title.substring(0, 100) + '...' : title;
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save detailed JSON
    const jsonPath = path.join(this.outputDir, `analysis-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
    console.log(`💾 Detailed results saved to: ${jsonPath}`);

    // Create summary CSV
    const csvData = [];
    this.results.forEach(result => {
      if (result.items && result.items.length > 0) {
        result.items.forEach(item => {
          csvData.push({
            competitor: item.competitor,
            title: item.title,
            extractedDate: item.extractedDate || 'No date found',
            isLikelyUpdate: item.isLikelyUpdate ? 'Yes' : 'No',
            contentPreview: item.content,
            contentLength: item.contentLength,
            scrapedAt: result.scrapedAt
          });
        });
      }
    });

    if (csvData.length > 0) {
      const csvPath = path.join(this.outputDir, `summary-${timestamp}.csv`);
      const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: [
          { id: 'competitor', title: 'Competitor' },
          { id: 'title', title: 'Title' },
          { id: 'extractedDate', title: 'Date' },
          { id: 'isLikelyUpdate', title: 'Likely Update' },
          { id: 'contentPreview', title: 'Content Preview' },
          { id: 'contentLength', title: 'Content Length' },
          { id: 'scrapedAt', title: 'Scraped At' }
        ]
      });

      await csvWriter.writeRecords(csvData);
      console.log(`📊 Summary CSV saved to: ${csvPath}`);
    }

    // Generate HTML report
    await this.generateHTMLReport(timestamp);
  }

  async generateHTMLReport(timestamp) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Competitor Analysis Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .competitor-section { background: white; margin: 20px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .competitor-title { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .update-item { border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; background: #f8f9fa; }
        .update-title { font-weight: bold; color: #333; margin-bottom: 8px; }
        .update-meta { font-size: 0.9em; color: #666; margin-bottom: 10px; }
        .update-content { line-height: 1.6; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-box { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .error { color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .likely-update { border-left-color: #4caf50; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏢 Competitor Analysis Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Analyzing: Braze, Iterable, and Klaviyo</p>
    </div>

    <div class="stats">
        ${this.results.map(result => `
            <div class="stat-box">
                <h3>${result.competitor}</h3>
                <div style="font-size: 2em; color: #667eea;">${result.itemCount}</div>
                <div>Updates Found</div>
            </div>
        `).join('')}
    </div>

    ${this.results.map(result => `
        <div class="competitor-section">
            <h2 class="competitor-title">${result.competitor}</h2>
            <p><strong>Source:</strong> <a href="${result.url}" target="_blank">${result.url}</a></p>
            <p><strong>Scraped:</strong> ${new Date(result.scrapedAt).toLocaleString()}</p>
            
            ${result.error ? `<div class="error">⚠️ Error: ${result.error}</div>` : ''}
            
            ${result.items && result.items.length > 0 ? result.items.slice(0, 10).map(item => `
                <div class="update-item ${item.isLikelyUpdate ? 'likely-update' : ''}">
                    <div class="update-title">${item.title}</div>
                    <div class="update-meta">
                        ${item.extractedDate ? `📅 ${item.extractedDate} • ` : ''}
                        ${item.isLikelyUpdate ? '🆕 Likely Update • ' : ''}
                        ${item.contentLength} characters
                    </div>
                    <div class="update-content">${item.content}</div>
                </div>
            `).join('') : '<p>No content found</p>'}
            
            ${result.items && result.items.length > 10 ? `<p><em>... and ${result.items.length - 10} more items</em></p>` : ''}
        </div>
    `).join('')}

    <footer style="text-align: center; margin-top: 40px; color: #666;">
        <p>Competitor Analysis Tool • Generated automatically</p>
    </footer>
</body>
</html>`;

    const htmlPath = path.join(this.outputDir, `report-${timestamp}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`📋 HTML report saved to: ${htmlPath}`);
  }

  async run() {
    console.log('🎯 Starting Competitor Analysis...\n');
    
    await this.initialize();
    await this.launchBrowser();

    try {
      // Scrape all competitors
      for (const competitorKey of Object.keys(this.competitors)) {
        const result = await this.scrapeCompetitor(competitorKey);
        this.results.push(result);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Save all results
      await this.saveResults();

      // Print summary
      console.log('\n📈 ANALYSIS COMPLETE!');
      console.log('=' + '='.repeat(50));
      this.results.forEach(result => {
        console.log(`${result.competitor}: ${result.itemCount} items found`);
        if (result.error) {
          console.log(`  ⚠️  Error: ${result.error}`);
        }
      });

    } catch (error) {
      console.error('❌ Analysis failed:', error);
    } finally {
      await this.closeBrowser();
    }
  }
}

// Run the analyzer
async function main() {
  const analyzer = new CompetitorAnalyzer();
  await analyzer.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompetitorAnalyzer;