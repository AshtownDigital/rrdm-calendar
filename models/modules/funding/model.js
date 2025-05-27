/**
 * Funding Module Model
 * Consolidated model for all funding-related operations
 */
const fs = require('fs').promises;
const path = require('path');
const { parse } = require('json2csv');

// Path to JSON data files (as mentioned in memory that the funding module uses JSON data files)
const DATA_PATH = path.join(__dirname, '../../../data/funding');

/**
 * Get all funding routes
 */
exports.getAllFundingRoutes = async () => {
  try {
    const data = await readJsonFile('routes.json');
    return data;
  } catch (error) {
    console.error('Error getting all funding routes:', error);
    throw error;
  }
};

/**
 * Get current year funding data
 */
exports.getCurrentYearFunding = async () => {
  try {
    const currentYear = new Date().getFullYear();
    return await this.getFundingByYear(currentYear);
  } catch (error) {
    console.error('Error getting current year funding:', error);
    throw error;
  }
};

/**
 * Get funding data for a specific year
 */
exports.getFundingByYear = async (year) => {
  try {
    const data = await readJsonFile('funding-by-year.json');
    return data.find(item => item.year === year) || null;
  } catch (error) {
    console.error(`Error getting funding for year ${year}:`, error);
    throw error;
  }
};

/**
 * Get funding requirements by route
 */
exports.getFundingRequirementsByRoute = async (routeId) => {
  try {
    const data = await readJsonFile('requirements.json');
    return data.filter(item => item.routeId === routeId);
  } catch (error) {
    console.error(`Error getting funding requirements for route ${routeId}:`, error);
    throw error;
  }
};

/**
 * Get funding history data
 */
exports.getFundingHistory = async (year, routeId = null) => {
  try {
    const data = await readJsonFile('history.json');
    
    // Filter by year
    let filtered = data.filter(item => item.year === year);
    
    // Further filter by route if provided
    if (routeId) {
      filtered = filtered.filter(item => item.routeId === routeId);
    }
    
    return filtered;
  } catch (error) {
    console.error('Error getting funding history:', error);
    throw error;
  }
};

/**
 * Get available years for funding data
 */
exports.getAvailableYears = async () => {
  try {
    const history = await readJsonFile('history.json');
    const years = [...new Set(history.map(item => item.year))];
    return years.sort((a, b) => b - a); // Sort descending
  } catch (error) {
    console.error('Error getting available years:', error);
    throw error;
  }
};

/**
 * Get report types
 */
exports.getReportTypes = async () => {
  try {
    const data = await readJsonFile('report-types.json');
    return data;
  } catch (error) {
    console.error('Error getting report types:', error);
    throw error;
  }
};

/**
 * Generate a funding report
 */
exports.generateReport = async (reportType, year, routeId = null) => {
  try {
    // Different report data based on type
    switch (reportType) {
      case 'allocation':
        return await exports.generateAllocationReport(year, routeId);
      case 'comparison':
        return await exports.generateComparisonReport(year, routeId);
      case 'forecast':
        return await exports.generateForecastReport(year, routeId);
      case 'summary':
        return await exports.generateSummaryReport(year, routeId);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

/**
 * Convert report data to CSV format
 */
exports.convertReportToCsv = async (reportData) => {
  try {
    // Handle different report data structures
    if (Array.isArray(reportData)) {
      // For tabular data
      return parse(reportData);
    } else if (reportData.data && Array.isArray(reportData.data)) {
      // For reports with metadata and tabular data
      return parse(reportData.data);
    } else {
      // For hierarchical data, flatten it
      const flattened = exports.flattenReportData(reportData);
      return parse(flattened);
    }
  } catch (error) {
    console.error('Error converting report to CSV:', error);
    throw error;
  }
};

/**
 * Helper function to read JSON files
 */
async function readJsonFile(filename) {
  try {
    const filePath = path.join(DATA_PATH, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON file ${filename}:`, error);
    throw error;
  }
}

/**
 * Generate allocation report
 */
exports.generateAllocationReport = async (year, routeId) => {
  try {
    const routes = await exports.getAllFundingRoutes();
    const history = await exports.getFundingHistory(year, routeId);
    
    // Group data by route
    const reportData = [];
    
    for (const route of routes) {
      if (!routeId || route.id === routeId) {
        const routeHistory = history.filter(item => item.routeId === route.id);
        
        if (routeHistory.length > 0) {
          reportData.push({
            routeName: route.name,
            allocation: routeHistory.reduce((sum, item) => sum + item.allocation, 0),
            spent: routeHistory.reduce((sum, item) => sum + item.spent, 0),
            remaining: routeHistory.reduce((sum, item) => sum + (item.allocation - item.spent), 0)
          });
        }
      }
    }
    
    return {
      title: `Funding Allocation Report for ${year}`,
      data: reportData,
      summary: {
        totalAllocation: reportData.reduce((sum, item) => sum + item.allocation, 0),
        totalSpent: reportData.reduce((sum, item) => sum + item.spent, 0),
        totalRemaining: reportData.reduce((sum, item) => sum + item.remaining, 0)
      }
    };
  } catch (error) {
    console.error('Error generating allocation report:', error);
    throw error;
  }
}

/**
 * Generate comparison report
 */
exports.generateComparisonReport = async (year, routeId) => {
  try {
    const currentYearData = await exports.getFundingHistory(year, routeId);
    const prevYearData = await exports.getFundingHistory(year - 1, routeId);
    
    const routes = await exports.getAllFundingRoutes();
    
    // Group data by route and compare
    const reportData = [];
    
    for (const route of routes) {
      if (!routeId || route.id === routeId) {
        const currentYearRouteData = currentYearData.filter(item => item.routeId === route.id);
        const prevYearRouteData = prevYearData.filter(item => item.routeId === route.id);
        
        const currentTotal = currentYearRouteData.reduce((sum, item) => sum + item.allocation, 0);
        const prevTotal = prevYearRouteData.reduce((sum, item) => sum + item.allocation, 0);
        
        if (currentYearRouteData.length > 0 || prevYearRouteData.length > 0) {
          reportData.push({
            routeName: route.name,
            currentYear: {
              year,
              allocation: currentTotal
            },
            previousYear: {
              year: year - 1,
              allocation: prevTotal
            },
            difference: currentTotal - prevTotal,
            percentChange: prevTotal === 0 ? 'N/A' : `${((currentTotal - prevTotal) / prevTotal * 100).toFixed(2)}%`
          });
        }
      }
    }
    
    return {
      title: `Funding Comparison Report: ${year} vs ${year - 1}`,
      data: reportData,
      summary: {
        currentYearTotal: reportData.reduce((sum, item) => sum + item.currentYear.allocation, 0),
        previousYearTotal: reportData.reduce((sum, item) => sum + item.previousYear.allocation, 0),
        totalDifference: reportData.reduce((sum, item) => sum + item.difference, 0)
      }
    };
  } catch (error) {
    console.error('Error generating comparison report:', error);
    throw error;
  }
}

/**
 * Generate forecast report
 */
exports.generateForecastReport = async (year, routeId) => {
  try {
    // Implementation would depend on your forecasting algorithm
    // This is a placeholder that simply extrapolates from past data
    
    const currentYearData = await exports.getFundingHistory(year, routeId);
    const routes = await exports.getAllFundingRoutes();
    
    // Group data by route and forecast
    const reportData = [];
    
    for (const route of routes) {
      if (!routeId || route.id === routeId) {
        const routeData = currentYearData.filter(item => item.routeId === route.id);
        const allocation = routeData.reduce((sum, item) => sum + item.allocation, 0);
        const spent = routeData.reduce((sum, item) => sum + item.spent, 0);
        
        // Simple linear forecast (placeholder)
        const forecastNextYear = allocation * 1.05; // 5% increase
        
        reportData.push({
          routeName: route.name,
          currentAllocation: allocation,
          currentSpent: spent,
          forecastNextYear,
          forecastChangePercent: '5%' // Placeholder
        });
      }
    }
    
    return {
      title: `Funding Forecast Report: ${year} to ${year + 1}`,
      data: reportData,
      summary: {
        currentTotal: reportData.reduce((sum, item) => sum + item.currentAllocation, 0),
        forecastTotal: reportData.reduce((sum, item) => sum + item.forecastNextYear, 0)
      }
    };
  } catch (error) {
    console.error('Error generating forecast report:', error);
    throw error;
  }
}

/**
 * Generate summary report
 */
exports.generateSummaryReport = async (year, routeId) => {
  try {
    const routes = await exports.getAllFundingRoutes();
    const yearData = await exports.getFundingByYear(year);
    
    // Create summary data
    const summaryData = {
      year,
      totalAllocation: yearData ? yearData.totalAllocation : 0,
      routeSummaries: []
    };
    
    // Add route-specific data
    for (const route of routes) {
      if (!routeId || route.id === routeId) {
        const requirements = await exports.getFundingRequirementsByRoute(route.id);
        const history = await exports.getFundingHistory(year, route.id);
        
        summaryData.routeSummaries.push({
          routeName: route.name,
          allocation: history.reduce((sum, item) => sum + item.allocation, 0),
          spent: history.reduce((sum, item) => sum + item.spent, 0),
          requirementCount: requirements.length,
          totalRequirements: requirements.reduce((sum, item) => sum + item.amount, 0)
        });
      }
    }
    
    return summaryData;
  } catch (error) {
    console.error('Error generating summary report:', error);
    throw error;
  }
}

/**
 * Helper function to flatten hierarchical report data for CSV
 */
exports.flattenReportData = (data, prefix = '', result = []) => {
  if (!data || typeof data !== 'object') {
    return result;
  }
  
  if (Array.isArray(data)) {
    // Handle array data
    data.forEach((item, index) => {
      if (typeof item === 'object') {
        flattenReportData(item, `${prefix}[${index}]`, result);
      } else {
        result.push({
          key: `${prefix}[${index}]`,
          value: item
        });
      }
    });
  } else {
    // Handle object data
    Object.entries(data).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flattenReportData(value, newKey, result);
      } else if (Array.isArray(value)) {
        flattenReportData(value, newKey, result);
      } else {
        result.push({
          key: newKey,
          value
        });
      }
    });
  }
  
  return result;
}
