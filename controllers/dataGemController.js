/**
 * Data Gem Controller
 * Provides endpoints for viewing Data Gem markdown reference data in a tabular format.
 */
const fs = require('fs');
const path = require('path');

/**
 * Parse a simple pipe-delimited markdown table into an array of objects.
 * Only supports basic tables without embedded pipes.
 * @param {string} markdown - raw markdown content
 * @returns {Array<object>} parsed rows or empty array
 */
// Parse markdown file into sections each with caption and table rows
function parseMarkdownSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Heading
    if (/^##?\s/.test(line)) {
      const caption = line.replace(/^#+\s*/, '').trim();
      // collect table lines (skip blank lines)
      const tableLines = [];
      i++;
      // skip until first table line that starts with |
      while (i < lines.length && !lines[i].trim().startsWith('|')) {
        i++;
      }
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 3) {
        const rows = parseSimpleTable(tableLines);
        sections.push({ caption, rows });
      }
    } else {
      i++;
    }
  }
  return sections;
}

// parse a simple table lines array to objects
function parseSimpleTable(tableLines) {
  const headerCells = tableLines[0].trim().split('|').map(c=>c.trim()).filter(Boolean);
  const rows = [];
  for (let r = 2; r < tableLines.length; r++) {
    const cells = tableLines[r].trim().split('|').map(c=>c.trim()).filter(Boolean);
    if(!cells.length) continue;
    const obj = {};
    headerCells.forEach((h,idx)=>{obj[h]=cells[idx]||'';});
    rows.push(obj);
  }
  return rows;
}

function parseMarkdownTable(markdown){
  // kept for backward compatibility; returns rows of first table
  const sections=parseMarkdownSections(markdown);
  return sections.length?sections[0].rows:[];
}


/**
 * Build file metadata
 * @param {string} dirPath - directory path
 * @param {string} filename - filename
 * @returns {object} file metadata
 */
function buildFileMeta(dirPath, filename) {
  try {
    const firstLines = fs.readFileSync(path.join(dirPath, filename), 'utf8').split(/\r?\n/);
    const headingLine = firstLines.find(l => /^#+\s/.test(l));
    const label = headingLine ? headingLine.replace(/^#+\s*/, '').trim() : filename.replace(/\.md$/i, '');
    return { filename, label, path: path.join(dirPath, filename), selected: false };
  } catch (e) {
    return { filename, label: filename, path: path.join(dirPath, filename), selected: false };
  }
}

/**
 * GET /data-gem/viewer
 * Renders the Data Gem Viewer page.
 */
exports.categories = (req,res)=>{
  const dirPath = path.join(process.cwd(),'data','data gem');
  const dirEntries = fs.readdirSync(dirPath,{withFileTypes:true});
  let folderCategories = []; let generalSections=[];
  dirEntries.forEach(entry=>{
    if(entry.isDirectory()){
      folderCategories.push(entry.name.replace(/[-_]/g,' '));
    }
  });
  if(fs.readdirSync(dirPath).some(e=>e.endsWith('.md'))){
    
  // extract sections from ref_data (1).md
  const generalFile=path.join(dirPath,'ref_data (1).md');
  if(fs.existsSync(generalFile)){
    const raw=fs.readFileSync(generalFile,'utf8');
    generalSections=parseMarkdownSections(raw).map(s=>s.caption);
  }
  }
  res.render('data-gem/categories.njk',{title:'Data Gem Categories',folderCategories,headings:generalSections,currentPage:'categories'});
};

exports.sections = (req,res)=>{
  // lists sections of a given file (default ref_data (1).md)
  const dirPath = path.join(process.cwd(),'data','data gem');
  const fileName = req.query.file || 'ref_data (1).md';
  const filePath = path.join(dirPath,fileName);
  if(!fs.existsSync(filePath)) return res.status(404).render('error',{message:'File not found'});
  const raw = fs.readFileSync(filePath,'utf8');
  const sections = parseMarkdownSections(raw);
  res.render('data-gem/sections.njk',{title:'Sections',file:fileName,sections,currentPage:'sections'});
};

exports.viewer = (req, res) => {
  try {
    const dirPath = path.join(process.cwd(), 'data', 'data gem');
    // Build groups: directories are logical sections
    const dirEntries = fs.readdirSync(dirPath, { withFileTypes: true });
    const groups = [];
    let selectedFilePath;
    // parse headings from ref_data (1).md for quick links
    const generalFilePath = path.join(dirPath,'ref_data (1).md');
    let generalHeadings=[];
    if(fs.existsSync(generalFilePath)){
      const rawGeneral = fs.readFileSync(generalFilePath,'utf8');
      // try parse sections but ignore if none returned because of explanatory text line
      const parsed = parseMarkdownSections(rawGeneral).map(s=>s.caption);
      if(parsed.length){
        generalHeadings = parsed;
      } else {
        // fallback: extract headings lines that start with ##
        generalHeadings = rawGeneral.split(/\r?\n/).filter(l=>/^##\s/.test(l)).map(l=>l.replace(/^##\s*/, '').trim());
      }
    }

    dirEntries.forEach((entry) => {
      if (entry.isDirectory()) {
        const groupName = entry.name.replace(/[-_]/g, ' ');
        const groupDir = path.join(dirPath, entry.name);
        const mdFiles = fs.readdirSync(groupDir).filter(f => f.endsWith('.md'));
        if (mdFiles.length) {
          const files = mdFiles.map((filename) => buildFileMeta(groupDir, filename));
          groups.push({ name: groupName, files });
        }
      }
    });

    // Root-level markdowns as "General"
    const rootMds = dirEntries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => e.name);
    if (rootMds.length) {
      const files = rootMds.map((filename)=>buildFileMeta(dirPath, filename));
      groups.unshift({ name: 'General', files });
    }

    if (groups.length === 0) {
      return res.status(404).render('error', { message: 'No Data Gem markdown files found' });
    }

        // Apply optional category filter
    let filteredGroups = groups;
    if (req.query.category) {
      const cat = req.query.category.toLowerCase();
      filteredGroups = groups.filter(g => g.name.toLowerCase() === cat);
      if (filteredGroups.length === 0) {
        return res.status(404).render('error', { message: `Category '${req.query.category}' not found` });
      }
    }

    // Flatten list for selection lookup
    const allFiles = filteredGroups.flatMap(g => g.files.map(f => f.filename));
    const selectedFile = req.query.file && allFiles.includes(req.query.file) ? req.query.file : allFiles[0];

    // mark selected
    filteredGroups.forEach(g => g.files.forEach(f => { f.selected = (f.filename === selectedFile);}));

    selectedFilePath = filteredGroups.flatMap(g=>g.files).find(f=>f.selected).path;

    // Parse table for selected file
    const rawContent = fs.readFileSync(selectedFilePath, 'utf8');
    let sections = parseMarkdownSections(rawContent);

    // optional section filter
    if(req.query.section){
      const norm = str=>str.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      const secNorm = norm(req.query.section);
      sections = sections.filter(s=>norm(s.caption)===secNorm);
      if(!sections.length){
        return res.status(404).render('error',{message:'Section not found'});
      }
    }

    // compute per-section stats when no section filter (for table summary)
    let generalStats = [];
    if(!req.query.section){
      // mapping of HESA Alignment -> Register Field Names (comma separated)
      const hesaMapRaw = {
        BURSLEV: 'Funding Method',
        DEGEST: 'Degree institutions, Awarding Institution',
        DEGCLSS: 'Degree grade',
        DEGTYPE: 'Degree types, UK degree type, Non-UK degree type',
        DISABLE: 'Disabilities, Disability 1, Disability 2, Disability 3, Disability 4, Disability 5, Disability 6, Disability 7, Disability 8, Disability 9',
        DEGCTRY: 'Degree country',
        NATION: 'Nationality, Country, Countries',
        ENTRYRTE: 'Training Route',
        DEGSBJ: 'Degree subject',
        ETHNIC: 'Ethnicity',
        FUNDCODE: 'Fund Code',
        INITIATIVES: 'Training Initiative, Additional Training Initiative',
        ITTAIM: 'ITT Aim',
        ITTPHSC: 'Age ranges, Course Age Range',
        MODE: 'Study Mode',
        QLAIM: 'Qualification Aim',
        SEXID: 'Sex',
        SBJCA: 'Course subjects, Course Subject One, Course Subject Two, Course Subject Three',
      };
      // build reverse lookup: register field name (normalized) -> alignment key
      const reverse = {};
      Object.entries(hesaMapRaw).forEach(([code,names])=>{
        names.split(',').forEach(n=>{
          const key = n.trim().toLowerCase();
          reverse[key]=code;
        });
      });
      const norm = s=>s.toLowerCase().trim();

      generalStats = sections.map(sec=>{
        const total = sec.rows.length;
        const miss = sec.rows.filter(r=>{
          const regVal = r['Register Value'] || r['Register value'] || '';
          return !regVal || /NOT FOUND/i.test(regVal);
        }).length;
        let align = reverse[norm(sec.caption)] || '';
        if(!align){
          // basic singular form heuristics
          let singular = norm(sec.caption);
          if(singular.endsWith('ies')) singular = singular.slice(0,-3)+'y';
          else if(singular.endsWith('s')) singular = singular.slice(0,-1);
          align = reverse[singular] || '';
        }
        if(!align){
          // fallback contains match
          const foundKey = Object.keys(reverse).find(k=>norm(sec.caption).includes(k));
          if(foundKey) align = reverse[foundKey];
        }
        return {caption:sec.caption,total,missing:miss,alignment:align};
      });
    }

    // recompute counts based on (possibly) filtered sections
    let totalRecords = 0;
    let missingCount = 0;
    const missingRows = [];
    sections.forEach(sec => {
      sec.rows.forEach(r => {
        totalRecords++;
        const regVal = r['Register Value'] || r['Register value'] || '';
        if (!regVal || /NOT FOUND/i.test(regVal)) {
          missingCount++;
          missingRows.push(r);
        }
      });
    });

    const sectionSelected = Boolean(req.query.section);
    res.render('data-gem/viewer.njk', {
      generalHeadings,
      sectionSelected,
      currentPage:'viewer',
      currentFile: selectedFile,
      title: 'Data Gem Viewer',
      sections,
      totalRecords,
      missingCount,
      hasMissing: missingCount > 0,
      missingRows,
      generalStats,
      groups: filteredGroups,
    });
  } catch (err) {

    return res.status(500).render('error', {
      message: 'Unable to load Data Gem data',
      error: err,
    });
  }
};
