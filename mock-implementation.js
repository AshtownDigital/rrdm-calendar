
// Example implementation for using mock academic years
const mockAcademicYears = require('./mock-data/academic-years.json');

// In your academicYearService.js
function getAllAcademicYears() {
  if (process.env.NODE_ENV === 'test') {
    return Promise.resolve(mockAcademicYears);
  }
  
  // Regular database query for production
  return AcademicYear.find().sort({ startDate: 1 });
}
