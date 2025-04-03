const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Set the content type based on the file extension
  const filePath = path.join(__dirname, '..', 'release_notes_requirements.docx');
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found!');
      return;
    }
    
    // Set headers for Word document
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=release_notes_requirements.docx');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Document server running at http://localhost:${PORT}`);
  console.log(`Access your Word document at http://localhost:${PORT}`);
});
