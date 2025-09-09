# Competitor Analysis Tool 🏢

An automated tool to monitor and analyze updates from key competitors: **Braze**, **Klaviyo**, and **Iterable**.

## Features ✨

- **Automated Scraping**: Monitors release notes and updates from competitor websites
- **Smart Content Detection**: Identifies likely product updates and new features
- **Multiple Output Formats**: Generates JSON, CSV, and HTML reports
- **Date Extraction**: Automatically extracts dates from content
- **Duplicate Prevention**: Filters out redundant content
- **Professional Reports**: Creates beautiful HTML reports with styling

## Monitored Competitors 🎯

| Competitor | Source URL | Content Type |
|------------|------------|--------------|
| **Braze** | https://www.braze.com/docs/help/release_notes | Release Notes |
| **Iterable** | https://support.iterable.com/hc/en-us/articles/33302033277332-2025-Release-Notes | 2025 Release Notes |
| **Klaviyo** | https://www.klaviyo.com/whats-new | What's New Updates |

## Quick Start 🚀

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/competitor-analysis-tool.git
   cd competitor-analysis-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the analysis**
   ```bash
   npm start
   ```

## Usage 📖

### Basic Analysis
```bash
node analyzer.js
```

### Using npm scripts
```bash
# Run analysis
npm run analyze

# Start with npm
npm start
```

## Output Files 📊

The tool generates three types of output in the `competitor-analysis-results/` directory:

### 1. Detailed JSON Report
- **File**: `analysis-[timestamp].json`
- **Contains**: Full scraping results with metadata
- **Use**: Programmatic analysis, data processing

### 2. Summary CSV Report  
- **File**: `summary-[timestamp].csv`
- **Contains**: Tabular data of all findings
- **Use**: Excel analysis, data visualization

### 3. HTML Report
- **File**: `report-[timestamp].html`
- **Contains**: Styled, readable report
- **Use**: Presentations, stakeholder reviews

## Sample Output Structure 🗂️

```
competitor-analysis-results/
├── analysis-2025-01-15T10-30-00-000Z.json
├── summary-2025-01-15T10-30-00-000Z.csv
└── report-2025-01-15T10-30-00-000Z.html
```

## Configuration ⚙️

### Adding New Competitors

Edit the `competitors` object in `analyzer.js`:

```javascript
this.competitors = {
  newCompetitor: {
    name: 'New Competitor',
    url: 'https://example.com/updates',
    selector: '.update-item',
    fallbackSelectors: ['.content', 'article']
  }
};
```

### Customizing Selectors

Each competitor has:
- **Primary selector**: Most specific CSS selector
- **Fallback selectors**: Alternative selectors if primary fails

## Automation Options 🔄

### GitHub Actions (Recommended)

Create `.github/workflows/competitor-analysis.yml`:

```yaml
name: Competitor Analysis
on:
  schedule:
    - cron: '0 9 * * 1,4'  # Monday and Thursday at 9 AM
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run analysis
        run: npm start
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: competitor-analysis-results
          path: competitor-analysis-results/
```

### Cron Job (Linux/Mac)

```bash
# Run every Monday and Thursday at 9 AM
0 9 * * 1,4 cd /path/to/competitor-analysis-tool && npm start
```

### Windows Task Scheduler

Create a scheduled task that runs:
```cmd
cmd /c "cd C:\path\to\competitor-analysis-tool && npm start"
```

## Error Handling 🔧

The tool includes robust error handling:

- **Network timeouts**: 30-second timeout per page
- **Selector failures**: Automatic fallback to alternative selectors
- **Rate limiting**: 2-second delays between requests
- **Content extraction**: Multiple extraction strategies

## Troubleshooting 🐛

### Common Issues

**"Page didn't load"**
- Check internet connection
- Verify URLs are accessible
- Some sites may block automated access

**"No content found"**
- Website structure may have changed
- Update CSS selectors in the configuration
- Check if site requires JavaScript rendering

**"Puppeteer installation failed"**
```bash
# Try manual installation
npm install puppeteer --force
```

### Debug Mode

Add debug logging by setting environment variable:
```bash
DEBUG=true npm start
```

## Contributing 🤝

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License 📄

MIT License - feel free to modify and distribute.

## Roadmap 🗺️

- [ ] **Slack Integration**: Send reports to Slack channels  
- [ ] **Email Notifications**: Automated email summaries
- [ ] **Trend Analysis**: Historical comparison and trending
- [ ] **AI Summarization**: Intelligent content summarization
- [ ] **API Endpoints**: REST API for integration
- [ ] **Dashboard UI**: Web-based dashboard interface
- [ ] **Webhook Support**: Real-time notifications

## Support 💬

For issues and questions:
- Create a GitHub issue
- Check the troubleshooting section
- Review the error logs in the console output

---

**Built with ❤️ for competitive intelligence**