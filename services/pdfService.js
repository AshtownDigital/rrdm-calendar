/**
 * PDF Service
 * Handles PDF generation for BCR reports using Puppeteer
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

/**
 * Generate a PDF from a URL
 * @param {string} url - URL to generate PDF from
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the generated PDF
 */
const generatePdfFromUrl = async (url, outputPath) => {
  let browser = null;
  
  try {
    // Create the directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Open a new page
    const page = await browser.newPage();
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });
    
    logger.info(`Generated PDF at ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error generating PDF:', error);
    throw error;
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Generate a PDF from HTML content
 * @param {string} htmlContent - HTML content to generate PDF from
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the generated PDF
 */
const generatePdfFromHtml = async (htmlContent, outputPath) => {
  let browser = null;
  
  try {
    // Create the directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Open a new page
    const page = await browser.newPage();
    
    // Set the HTML content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });
    
    logger.info(`Generated PDF at ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error generating PDF:', error);
    throw error;
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Generate a BCR report PDF
 * @param {Object} bcr - BCR data
 * @param {string} baseUrl - Base URL for the application
 * @returns {Promise<string>} - Path to the generated PDF
 */
const generateBcrReport = async (bcr, baseUrl) => {
  try {
    // Create a unique filename for the PDF
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '../public/reports');
    const outputPath = path.join(outputDir, `${bcr.bcrNumber}_${timestamp}.pdf`);
    
    // Generate the PDF from the BCR detail page
    const url = `${baseUrl}/bcr/${bcr.id}?print=true`;
    return await generatePdfFromUrl(url, outputPath);
  } catch (error) {
    logger.error('Error generating BCR report:', error);
    throw error;
  }
};

module.exports = {
  generatePdfFromUrl,
  generatePdfFromHtml,
  generateBcrReport
};
