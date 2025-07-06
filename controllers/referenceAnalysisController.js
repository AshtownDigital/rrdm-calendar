const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

// --- helpers -------------------------------------------------------------
function parseMarkdownSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^##?\s/.test(line)) {
      const caption = line.replace(/^#+\s*/, '').trim();
      const tableLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('|')) i++;
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

function parseSimpleTable(tableLines) {
  const headerCells = tableLines[0].trim().split('|').map(c => c.trim()).filter(Boolean);
  const rows = [];
  for (let r = 2; r < tableLines.length; r++) {
    const cells = tableLines[r].trim().split('|').map(c => c.trim()).filter(Boolean);
    if (!cells.length) continue;
    const obj = {};
    headerCells.forEach((h, idx) => {
      obj[h] = cells[idx] || '';
    });
    rows.push(obj);
  }
  return rows;
}

// Excel workbook loader (cached)
let workbookCache;
function loadWorkbook(){
  if(workbookCache) return workbookCache;
  const filePath = path.join(process.cwd(),'data','HESA Reference Data.xlsx');
  if(!fs.existsSync(filePath)) throw new Error('Workbook not found: '+filePath);
  workbookCache = XLSX.readFile(filePath);
  return workbookCache;
}
function getRowsFromExcelSheet(sheetName){
  const wb = loadWorkbook();
  const ws = wb.Sheets[sheetName];
  if(!ws) throw new Error(`Sheet ${sheetName} not found in workbook`);
  const json = XLSX.utils.sheet_to_json(ws,{header:1});
  if(json.length<2) return [];
  const header = json[0].map(h=>String(h).trim());
  const idxCode = header.findIndex(h=>/code/i.test(h));
  const idxLabel = header.findIndex(h=>/label/i.test(h));
  const rows=[];
  for(let r=1;r<json.length;r++){
    const row=json[r];
    const code=row[idxCode];
    const label=row[idxLabel];
    if(code!==undefined && code!==null) rows.push({code:String(code).trim(),label:String(label||'').trim()});
  }
  return rows;
}

// Removed legacy csv parser (unused)

// --- dynamic mapping build ---------------------------------------------------
function buildDynamicMapping(){
  // seed with known aliases to ensure viewer alignment remains stable
  const base = {
    BURSLEV: 'Funding Method',
    DEGEST: 'Awarding Institution, Degree institutions',
    DEGCLSS: 'Degree grade',
    DEGTYPE: 'Degree types, UK degree type, Non-UK degree type',
    DISABLE: 'Disabilities',
    DEGCTRY: 'Degree country',
    NATION: 'Nationality, Country, Countries',
    ENTRYRTE: 'Training Route',
    DEGSBJ: 'Degree subject, Course Subject',
    ETHNIC: 'Ethnicity',
    FUNDCODE: 'Fund Code',
    INITIATIVES: 'Training Initiative, Training initiatives',
    ITTAIM: 'ITT Aim',
    ITTPHSC: 'Age ranges, Course Age Range',
    MODE: 'Study Mode',
    QLAIM: 'Qualification Aim, Qualification Aims, ITT qualification aims',
    SEXID: 'Sex',
    SBJCA: 'Course subjects',
  };
  try{
    const wb = loadWorkbook();
    Object.keys(wb.Sheets).forEach(code=>{
      if(!/^[A-Z]{3,}$/.test(code)) return; // sheet names are alignment codes
      const ws = wb.Sheets[code];
      const data = XLSX.utils.sheet_to_json(ws,{header:1});
      if(data.length<2) return;
      const headerLower = data[0].map(h=>String(h).trim().toLowerCase());
      const idxReg = headerLower.findIndex(h=>h.startsWith('register field'));
      if(idxReg===-1) return;
      const names = new Set((base[code]||'').split(',').map(s=>s.trim()).filter(Boolean));
      for(let r=1;r<data.length;r++){
        const name = String(data[r][idxReg]||'').trim();
        if(name){
        names.add(name);
        // very simple plural/singular variants
        if(/ies$/i.test(name)) names.add(name.replace(/ies$/i,'y'));
        else if(/y$/i.test(name)) names.add(name.replace(/y$/i,'ies'));
        else if(/(s|x|z|ch|sh)$/i.test(name)) names.add(name+'es');
        else names.add(name+'s');
        // add ITT prefix variants
        if(!/^itt /i.test(name)) names.add('ITT '+name);
      }
      }
      base[code] = Array.from(names).join(', ');
    });
  }catch(e){
    // Error handling without console.warn
  }
  return base;
}

const HESA_MAPPING = buildDynamicMapping();

// --- controller actions ---------------------------------------------------

// Unified builder for directory data so other modules can reuse a single source
function getDirectoryData() {
  try {
    // Build items array (logic extracted from previous directory function)
    const alignmentCodes = Object.keys(HESA_MAPPING);
    const items = [];

    alignmentCodes.forEach(code => {
      const fieldName = HESA_MAPPING[code].split(',')[0].trim();
      const isTrainingRoute = fieldName === 'Training Route';

      if (fieldName === 'Nationality') {
        try {
          const rows = getRowsFromExcelSheet(code);
          rows.forEach(r => items.push({
            fieldName, code: r.code, label: r.label, academicYear: '25/26', status: 'no-change'
          }));
        } catch {}
        return;
      }

      try {
        const diff = compareSingleAlignment(code);
        diff.aligned.forEach(r => {
          let status = 'no-change';
          if (isTrainingRoute && r.code === '13' && (r.gemLabel === 'Provider-led salaried (postgraduate)' || r.csvLabel === 'Provider-led salaried (postgraduate)')) {
            status = 'removed';
          }
          items.push({ fieldName, code: r.code, label: r.gemLabel || r.csvLabel, academicYear: '25/26', status });
        });
        diff.onlyCsv.forEach(r => {
          let status = 'removed';
          if (isTrainingRoute && r.code === '14' && r.label === 'Teacher Degree Apprenticeship') status = 'new';
          items.push({ fieldName, code: r.code, label: r.label, academicYear: '25/26', status });
        });
        diff.onlyGem.forEach(r => items.push({ fieldName, code: r.code, label: r.label, academicYear: '25/26', status: 'new' }));
      } catch {}
    });

    // Degree subjects via markdown
    try {
      const degreeFile = path.join(process.cwd(), 'data', 'data gem', 'register_degree_subhject.md');
      const content = fs.readFileSync(degreeFile, 'utf8');
      const lines = content.split('\n');
      lines.forEach(line => {
        if (line.includes('::DegreeSubjects::') && line.includes('entity_id')) {
          const subjectMatch = line.match(/::DegreeSubjects::([A-Z_]+)/);
          const entityMatch = line.match(/entity_id:\s*"([^"]+)"/);
          if (subjectMatch && entityMatch) {
            const subjectName = subjectMatch[1].split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
            items.push({ fieldName: 'Degree subject', code: entityMatch[1].substring(0,8), label: subjectName, academicYear: '25/26', status: 'no-change' });
          }
        }
      });
    } catch {}

    // Remove any Degree subject rows that were previously marked removed (none should exist now)
    for (let i = items.length-1; i>=0; i--) {
      if (items[i].fieldName === 'Degree subject' && items[i].status === 'removed') items.splice(i,1);
    }

    // Field mappings (static)
    const fieldMappings = [
      { registerFieldName: 'Funding Method', csvFieldName: 'Funding Method', apiFieldName: 'funding_method' },
      { registerFieldName: 'Awarding Institution', csvFieldName: 'Awarding Institution', apiFieldName: 'institution' },
      { registerFieldName: 'Degree grade', csvFieldName: 'Degree grade', apiFieldName: 'grade' },
      { registerFieldName: 'Degree types', csvFieldName: 'UK degree type, Non-UK degree type', apiFieldName: 'uk_degree, non_uk_degree' },
      { registerFieldName: 'Disabilities', csvFieldName: 'Disability 1, Disability 2, Disability 3, Disability 4, Disability 5, Disability 6, Disability 7, Disability 8, Disability 9', apiFieldName: 'disability1, disability2, disability3, disability4, disability5, disability6, disability7, disability8, disability9' },
      { registerFieldName: 'Degree country', csvFieldName: 'Degree country', apiFieldName: 'country' },
      { registerFieldName: 'Nationality', csvFieldName: 'Nationality', apiFieldName: 'nationality' },
      { registerFieldName: 'Training Route', csvFieldName: 'Training Route', apiFieldName: 'training_route' },
      { registerFieldName: 'Degree subject', csvFieldName: 'Degree subject', apiFieldName: 'subject' },
      { registerFieldName: 'Ethnicity', csvFieldName: 'Ethnicity', apiFieldName: 'ethnicity' },
      { registerFieldName: 'Fund Code', csvFieldName: 'Fund Code', apiFieldName: 'fund_code' },
      { registerFieldName: 'Training Initiatives', csvFieldName: 'Training Initiative, Additional Training Initiative', apiFieldName: 'training_initiative, additional_training_initiative' },
      { registerFieldName: 'ITT Aim', csvFieldName: 'ITT Aim', apiFieldName: 'itt_aim' },
      { registerFieldName: 'Course Age Range', csvFieldName: 'Course Age Range', apiFieldName: 'course_age_range' },
      { registerFieldName: 'Study Mode', csvFieldName: 'Study Mode', apiFieldName: 'study_mode' },
      { registerFieldName: 'Qualification Aim', csvFieldName: 'Qualification Aim', apiFieldName: 'itt_qualification_aim' },
      { registerFieldName: 'Sex', csvFieldName: 'Sex', apiFieldName: 'sex' },
      { registerFieldName: 'Course Subjects', csvFieldName: 'Course Subject One, Course Subject Two, Course Subject Three', apiFieldName: 'course_subject_one, course_subject_two, course_subject_three' }
    ];

    // Persist combined directory data as a single JSON source file for reuse across the app
    try {
      const outputDir = path.join(process.cwd(), 'data', 'reference-data-source');
      fs.mkdirSync(outputDir, { recursive: true });
      const outPath = path.join(outputDir, 'directory-view-source.json');
      fs.writeFileSync(outPath, JSON.stringify({ items, fieldMappings }, null, 2), 'utf8');
    } catch(writeErr) {
      // silent fail – do not block main flow
    }
    return { items, fieldMappings };
  } catch (e) {
    return { items: [], fieldMappings: [] };
  }
}

exports.getDirectoryData = getDirectoryData;



function compareSingleAlignment(alignmentCode){
  const gemPath = path.join(process.cwd(), 'data', 'data gem', 'ref_data (1).md');
  // Read the markdown file without logging
  const gemSections = parseMarkdownSections(fs.readFileSync(gemPath,'utf8'));
  // build reverse mapping same as earlier
  const reverse = {};
  Object.entries(HESA_MAPPING).forEach(([code,names])=>{
    names.split(',').forEach(n=>{reverse[n.trim().toLowerCase()]=code;});
  });
  const norm = s=>s.toLowerCase().trim();
  const targetSecs = gemSections.filter(s=>reverse[norm(s.caption)]===alignmentCode);
  const gemCodes=new Map();
  targetSecs.forEach(sec=>sec.rows.forEach(r=>{
    const code=String(r['HESA Code']).trim();
    const label=(r['HESA Label']||'').trim();
    if(code) gemCodes.set(code,label);
  }));

  // get rows from Excel sheet
  const excelRows = getRowsFromExcelSheet(alignmentCode);
  const csvCodes=new Map();
  excelRows.forEach(r=>csvCodes.set(r.code.trim(),r.label.trim()));

  const aligned=[]; const onlyCsv=[]; const onlyGem=[];
  csvCodes.forEach((label,code)=>{
    if(gemCodes.has(code)){
      aligned.push({code,csvLabel:label,gemLabel:gemCodes.get(code)});
    }else{
      onlyCsv.push({code,label});
    }
  });
  gemCodes.forEach((label,code)=>{if(!csvCodes.has(code)) onlyGem.push({code,label});});

  return {aligned,onlyCsv,onlyGem,csvCount:csvCodes.size,gemCount:gemCodes.size};
}

exports.analysis = (req,res)=>{
  // default analyse DEGEST
  const data = compareSingleAlignment('DEGEST');
  res.render('reference-data/analysis.njk',{
    title:'Reference Data Analysis - DEGEST',
    aligned:data.aligned,
    onlyCsv:data.onlyCsv,
    onlyGem:data.onlyGem,
    counts:{csv:data.csvCount,gem:data.gemCount,aligned:data.aligned.length,onlyCsv:data.onlyCsv.length,onlyGem:data.onlyGem.length},
    currentPage:'analysis',
    alignment:'DEGEST'
  });
};

exports.structure = (req,res)=>{
  const alignments = Object.keys(HESA_MAPPING);
  const rows = alignments.map(code=>{
    try{
      const {csvCount,gemCount,aligned,onlyCsv,onlyGem}=compareSingleAlignment(code);
      return {
        code,
        register:HESA_MAPPING[code].split(',')[0].trim(),
        csv:csvCount,
        gem:gemCount,
        aligned:aligned.length,
        onlyCsv:onlyCsv.length,
        onlyGem:onlyGem.length,
      };
    }catch(err){
      return {code,register:HESA_MAPPING[code].split(',')[0].trim(),error:true};
    }
  });
  res.render('reference-data/analysis-structure.njk',{
    title:'Reference Data Analysis Overview',
    rows,
    currentPage:'analysis-structure'
  });
};

exports.analysisByAlignment = (req,res)=>{
  const code = (req.params.alignment||'').toUpperCase();
  try{
    const data = compareSingleAlignment(code);
    // Build unified rows
    const rows = [];
    data.aligned.forEach(r=> rows.push({code:r.code,csvLabel:r.csvLabel,gemLabel:r.gemLabel,status:'no-change'}));
    data.onlyCsv.forEach(r=> rows.push({code:r.code,csvLabel:r.label,gemLabel:'',status:'removed'}));
    data.onlyGem.forEach(r=> rows.push({code:r.code,csvLabel:'',gemLabel:r.label,status:'new'}));

    res.render('reference-data/analysis.njk',{
      title:`Reference Data Analysis - ${code}`,
      rows,
      counts:{csv:data.csvCount,gem:data.gemCount,aligned:data.aligned.length,onlyCsv:data.onlyCsv.length,onlyGem:data.onlyGem.length},
      currentPage:'analysis',
      alignment:code
    });
  }catch(err){
    return res.status(404).render('error',{message:err.message});
  }
};

const DirectoryEntry = require('../models/DirectoryEntry');

exports.directory = async (req, res) => {
  try {
    // Fetch directory items from MongoDB
    const items = await DirectoryEntry.find().lean();

    // Attempt to load fieldMappings from JSON file produced by builder
    let fieldMappings = [];
    try {
      const jsonPath = path.join(process.cwd(), 'data', 'reference-data-source', 'directory-view-source.json');
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      fieldMappings = jsonData.fieldMappings || [];
    } catch (_) {
      // fall back to builder if file missing
      fieldMappings = getDirectoryData().fieldMappings;
    }

    return res.render('reference-data/directory.njk', {
      title: 'Reference Data Directory',
      items,
      fieldMappings,
      hesaMapping: HESA_MAPPING
    });
  } catch (err) {
    return res.status(500).render('error', { message: err.message });
  }
}; // end directory

/* Legacy directory implementation (now unused) kept below for reference

    // Get all reference data fields from HESA_MAPPING
    const alignmentCodes = Object.keys(HESA_MAPPING);
    
    // Create items array for the table
    // items now provided by builder
    
    // Process each alignment code
    alignmentCodes.forEach(code => {
      // Get the field name from mapping
      const fieldName = HESA_MAPPING[code].split(',')[0].trim();
      
      // Special case for Training Route items
      const isTrainingRoute = fieldName === 'Training Route';
      
      // Special case for Nationality - use only CSV data
      if (fieldName === 'Nationality') {
        try {
          // Get the CSV data for nationality
          const csvData = getRowsFromExcelSheet(code);
          if (csvData && csvData.length > 0) {
            // Add all CSV items with no-change status
            csvData.forEach(row => {
              items.push({
                fieldName: fieldName,
                code: row.code,
                label: row.label,
                academicYear: '25/26',
                status: 'no-change'
              });
            });
          }
        } catch (error) {
          // Error handling without console.error
        }
      } else {
        // Normal processing for other alignment codes
        try {
          const data = compareSingleAlignment(code);
          
          // Add aligned items
          data.aligned.forEach(r => {
            // Special case for Provider-led salaried (postgraduate) - always set to Removed
            let status = 'no-change';
            if (isTrainingRoute && r.code === '13' && (r.gemLabel === 'Provider-led salaried (postgraduate)' || r.csvLabel === 'Provider-led salaried (postgraduate)')) {
              status = 'removed';
            }
            
            items.push({
              fieldName: fieldName,
              code: r.code,
              label: r.gemLabel || r.csvLabel,
              academicYear: '25/26',
              status: status
            });
          });
          
          // Add CSV-only items
          data.onlyCsv.forEach(r => {
            // Special case for Training Route items with specific codes
            let status = 'removed';
            
            // Override status for specific Training Route items
            if (isTrainingRoute) {
              if (r.code === '14' && r.label === 'Teacher Degree Apprenticeship') {
                status = 'new';
              } else if (r.code === '13' && r.label === 'Provider-led salaried (postgraduate)') {
                status = 'removed';
              }
            }
            
            items.push({
              fieldName: fieldName,
              code: r.code,
              label: r.label,
              academicYear: '25/26',
              status: status
            });
          });
          
          // Add Gem-only items
          data.onlyGem.forEach(r => items.push({
            fieldName: fieldName,
            code: r.code,
            label: r.label,
            academicYear: '25/26',
            status: 'new'
          }));
        } catch (error) {
          // Skip this alignment if there's an error
          // Error handling without console.error
        }
      }
    });
    
    // Add degree subjects from register_degree_subhject.md file
    try {
      const path = require('path');
      const fs = require('fs');
      const degreeSubjectsPath = path.join(process.cwd(), 'data', 'data gem', 'register_degree_subhject.md');
      
      // Read the file content
      const fileContent = fs.readFileSync(degreeSubjectsPath, 'utf8');
      
      // Parse the degree subjects from the Ruby module format using line-by-line approach
      const lines = fileContent.split('\n');
      const degreeSubjects = [];
      
      // Process each line that contains a degree subject entry
      lines.forEach(line => {
        // Look for lines with the pattern ::DegreeSubjects::SUBJECT_NAME => { entity_id: "..." }
        if (line.includes('::DegreeSubjects::') && line.includes('entity_id')) {
          // Extract the subject name (in SNAKE_CASE)
          const subjectMatch = line.match(/::DegreeSubjects::([A-Z_]+)/);
          if (subjectMatch && subjectMatch[1]) {
            const subjectCode = subjectMatch[1]; // e.g., ACCOUNTANCY
            
            // Extract the entity ID
            const entityMatch = line.match(/entity_id:\s*"([^"]+)"/); 
            if (entityMatch && entityMatch[1]) {
              const entityId = entityMatch[1]; // e.g., 917f70f0-5dce-e911-a985-000d3ab79618
              
              // Convert SNAKE_CASE to Title Case
              const subjectName = subjectCode.split('_')
                .map(word => word.charAt(0) + word.slice(1).toLowerCase())
                .join(' ');
              
              degreeSubjects.push({
                code: entityId.substring(0, 8), // Use first part of entity_id as code
                name: subjectName
              });
            }
          }
        }
      });
      
      // Add degree subjects to items array
      degreeSubjects.forEach(subject => {
        items.push({
          fieldName: 'Degree subject',
          code: subject.code,
          label: subject.name,
          academicYear: '25/26',
          status: 'no-change'
        });
      });
      
      // Remove any degree subjects with "removed" status
      // Find and remove items instead of reassigning the constant
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].fieldName === 'Degree subject' && items[i].status === 'removed') {
          items.splice(i, 1);
        }
      }
    } catch (error) {
      // Error handling without console.error
    }
    
    // Create field mappings for the template
    const fieldMappings = [
      { registerFieldName: 'Funding Method', csvFieldName: 'Funding Method', apiFieldName: 'funding_method' },
      { registerFieldName: 'Awarding Institution', csvFieldName: 'Awarding Institution', apiFieldName: 'institution' },
      { registerFieldName: 'Degree grade', csvFieldName: 'Degree grade', apiFieldName: 'grade' },
      { registerFieldName: 'Degree types', csvFieldName: 'UK degree type, Non-UK degree type', apiFieldName: 'uk_degree, non_uk_degree' },
      { registerFieldName: 'Disabilities', csvFieldName: 'Disability 1, Disability 2, Disability 3, Disability 4, Disability 5, Disability 6, Disability 7, Disability 8, Disability 9', apiFieldName: 'disability1, disability2, disability3, disability4, disability5, disability6, disability7, disability8, disability9' },
      { registerFieldName: 'Degree country', csvFieldName: 'Degree country', apiFieldName: 'country' },
      { registerFieldName: 'Nationality', csvFieldName: 'Nationality', apiFieldName: 'nationality' },
      { registerFieldName: 'Training Route', csvFieldName: 'Training Route', apiFieldName: 'training_route' },
      { registerFieldName: 'Degree subject', csvFieldName: 'Degree subject', apiFieldName: 'subject' },
      { registerFieldName: 'Ethnicity', csvFieldName: 'Ethnicity', apiFieldName: 'ethnicity' },
      { registerFieldName: 'Fund Code', csvFieldName: 'Fund Code', apiFieldName: 'fund_code' },
      { registerFieldName: 'Training Initiatives', csvFieldName: 'Training Initiative, Additional Training Initiative', apiFieldName: 'training_initiative, additional_training_initiative' },
      { registerFieldName: 'ITT Aim', csvFieldName: 'ITT Aim', apiFieldName: 'itt_aim' },
      { registerFieldName: 'Course Age Range', csvFieldName: 'Course Age Range', apiFieldName: 'course_age_range' },
      { registerFieldName: 'Study Mode', csvFieldName: 'Study Mode', apiFieldName: 'study_mode' },
      { registerFieldName: 'Qualification Aim', csvFieldName: 'Qualification Aim', apiFieldName: 'itt_qualification_aim' },
      { registerFieldName: 'Sex', csvFieldName: 'Sex', apiFieldName: 'sex' },
      { registerFieldName: 'Course Subjects', csvFieldName: 'Course Subject One, Course Subject Two, Course Subject Three', apiFieldName: 'course_subject_one, course_subject_two, course_subject_three' }
    ];

    // Render the directory template with items and field mappings
    res.render('reference-data/directory.njk', { 
      title: 'Reference Data Directory',
      items, 
      fieldMappings,
      hesaMapping: HESA_MAPPING
    });
  } catch(err) {
    return res.status(500).render('error', {message: err.message});
  }
};

*/

// Field Mapping Reference page
exports.fieldMapping = (req, res) => {
  try {
    // Create field mappings for the template
    const HESA_MAPPING = require('../data/hesa-mapping');
    
    const fieldMappings = [
      { registerFieldName: 'Funding Method', csvFieldName: 'Funding Method', apiFieldName: 'funding_method' },
      { registerFieldName: 'Awarding Institution', csvFieldName: 'Awarding Institution', apiFieldName: 'institution' },
      { registerFieldName: 'Degree grade', csvFieldName: 'Degree grade', apiFieldName: 'grade' },
      { registerFieldName: 'Degree types', csvFieldName: 'UK degree type, Non-UK degree type', apiFieldName: 'uk_degree, non_uk_degree' },
      { registerFieldName: 'Disabilities', csvFieldName: 'Disability 1, Disability 2, Disability 3, Disability 4, Disability 5, Disability 6, Disability 7, Disability 8, Disability 9', apiFieldName: 'disability1, disability2, disability3, disability4, disability5, disability6, disability7, disability8, disability9' },
      { registerFieldName: 'Degree country', csvFieldName: 'Degree country', apiFieldName: 'country' },
      { registerFieldName: 'Nationality', csvFieldName: 'Nationality', apiFieldName: 'nationality' },
      { registerFieldName: 'Training Route', csvFieldName: 'Training Route', apiFieldName: 'training_route' },
      { registerFieldName: 'Degree subject', csvFieldName: 'Degree subject', apiFieldName: 'subject' },
      { registerFieldName: 'Ethnicity', csvFieldName: 'Ethnicity', apiFieldName: 'ethnicity' },
      { registerFieldName: 'Fund Code', csvFieldName: 'Fund Code', apiFieldName: 'fund_code' },
      { registerFieldName: 'Training Initiatives', csvFieldName: 'Training Initiative, Additional Training Initiative', apiFieldName: 'training_initiative, additional_training_initiative' },
      { registerFieldName: 'ITT Aim', csvFieldName: 'ITT Aim', apiFieldName: 'itt_aim' },
      { registerFieldName: 'Course Age Range', csvFieldName: 'Course Age Range', apiFieldName: 'course_age_range' },
      { registerFieldName: 'Study Mode', csvFieldName: 'Study Mode', apiFieldName: 'study_mode' },
      { registerFieldName: 'Qualification Aim', csvFieldName: 'Qualification Aim', apiFieldName: 'itt_qualification_aim' },
      { registerFieldName: 'Sex', csvFieldName: 'Sex', apiFieldName: 'sex' },
      { registerFieldName: 'Course Subjects', csvFieldName: 'Course Subject One, Course Subject Two, Course Subject Three', apiFieldName: 'course_subject_one, course_subject_two, course_subject_three' }
    ];
    
    // Render the field mapping template
    res.render('reference-data/field-mapping', {
      title: 'Field Mapping Reference',
      fieldMappings,
      hesaMapping: HESA_MAPPING,
      currentPage: 'field-mapping'
    });
  } catch(err) {
    return res.status(500).render('error', {message: err.message});
  }
};

/**
 * Export the reference data directory to Excel
 * Creates a workbook with a summary sheet and separate sheets for each category
 */

exports.exportDirectory = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Reference Data Directory';
    workbook.lastModifiedBy = 'RRDM System';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Create a summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Category', key: 'category', width: 30 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'New', key: 'new', width: 10 },
      { header: 'No Change', key: 'noChange', width: 10 },
      { header: 'Removed', key: 'removed', width: 10 }
    ];
    
    // Style the header row
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Get directory data (reuse code from directory function)
    let items = [];

    // Build default categories by reading rows from the original HESA Excel workbook (excluding the special cases handled later)
    Object.keys(HESA_MAPPING).forEach(alignmentCode => {
      const [fieldName] = HESA_MAPPING[alignmentCode].split(',').map(s => s.trim());
      if (!fieldName || ['Nationality', 'Training Route', 'Degree subject'].includes(fieldName)) {
        return;
      }
      try {
        // Try to read rows from the original Excel workbook first
        let rows = [];
        try {
          rows = getRowsFromExcelSheet(alignmentCode);
        } catch (err) {
          // ignore, will fallback to JSON
        }
        if (!rows.length) {
          // Fallback: attempt to load a pre-generated JSON file in data/<field-name>.json
          try {
            const fileName = `${fieldName.toLowerCase().replace(/\s+/g, '-')}.json`;
            rows = require(path.join(process.cwd(), 'data', fileName));
            // Normalise the different property names between sources
            rows = rows.map(r => ({ code: r.code, label: r.label }));
          } catch (e) {
            rows = [];
          }
        }
        rows.forEach(r => {
          items.push({
            fieldName,
            code: r.code,
            label: r.label,
            academicYear: '25/26',
            status: 'no-change'
          });
        });

        // Add 'new' and 'removed' records based on comparison with register (GEM) data
        try {
          const diff = compareSingleAlignment(alignmentCode);
          // Records present only in GEM (register) are new
          diff.onlyGem.forEach(r => {
            items.push({
              fieldName,
              code: r.code,
              label: r.label,
              academicYear: '25/26',
              status: 'new'
            });
          });
          // Records present only in CSV/Excel are removed
          diff.onlyCsv.forEach(r => {
            items.push({
              fieldName,
              code: r.code,
              label: r.label,
              academicYear: '25/26',
              status: 'removed'
            });
          });
        } catch (e) {
          // Ignore comparison errors for this alignment
        }
      } catch (err) {
        // Skip this alignment if there is any problem (e.g. sheet missing)
      }
    });
    
    // Special case for Nationality – treat all workbook rows as no-change
    try {
      const natRows = getRowsFromExcelSheet('NATION');
      
      natRows.forEach(r => {
        const status = 'no-change';
        
        items.push({
          fieldName: 'Nationality',
          code: r.code,
          label: r.label,
          academicYear: '25/26',
          status
        });
      });
    } catch (error) {
      // Skip this alignment if there's an error
    }
    
    // Special case for Training Route – replicate directory / confirmation rules
    try {
      const diff = compareSingleAlignment('ENTRYRTE');
      
      // aligned entries
      diff.aligned.forEach(r => {
        let status = 'no-change';
        const label = r.gemLabel || r.csvLabel;
        if (r.code === '13' && label === 'Provider-led salaried (postgraduate)') {
          status = 'removed';
        }
        items.push({
          fieldName: 'Training Route',
          code: r.code,
          label,
          academicYear: '25/26',
          status
        });
      });
      // csv-only entries
      diff.onlyCsv.forEach(r => {
        let status = 'removed';
        if (r.code === '14' && r.label === 'Teacher Degree Apprenticeship') {
          status = 'new';
        }
        items.push({
          fieldName: 'Training Route',
          code: r.code,
          label: r.label,
          academicYear: '25/26',
          status
        });
      });
      // gem-only entries are new
      diff.onlyGem.forEach(r => {
        items.push({
          fieldName: 'Training Route',
          code: r.code,
          label: r.label,
          academicYear: '25/26',
          status: 'new'
        });
      });
    } catch (error) {
      // Skip this alignment if there's an error
    }
    
    // Add degree subjects from register_degree_subhject.md file
    try {
      const path = require('path');
      const fs = require('fs');
      const degreeSubjectsPath = path.join(process.cwd(), 'data', 'data gem', 'register_degree_subhject.md');
      
      // Read the file content
      const fileContent = fs.readFileSync(degreeSubjectsPath, 'utf8');
      
      // Parse the degree subjects from the Ruby module format using line-by-line approach
      const lines = fileContent.split('\n');
      const degreeSubjects = [];
      
      // Process each line that contains a degree subject entry
      lines.forEach(line => {
        // Look for lines with the pattern ::DegreeSubjects::SUBJECT_NAME => { entity_id: "..." }
        if (line.includes('::DegreeSubjects::') && line.includes('entity_id')) {
          // Extract the subject name (in SNAKE_CASE)
          const subjectMatch = line.match(/::DegreeSubjects::([A-Z_]+)/);
          if (subjectMatch && subjectMatch[1]) {
            const subjectCode = subjectMatch[1]; // e.g., ACCOUNTANCY
            
            // Extract the entity ID
            const entityMatch = line.match(/entity_id:\s*"([^"]+)"/); 
            if (entityMatch && entityMatch[1]) {
              const entityId = entityMatch[1]; // e.g., 917f70f0-5dce-e911-a985-000d3ab79618
              
              // Convert SNAKE_CASE to Title Case
              const subjectName = subjectCode.split('_')
                .map(word => word.charAt(0) + word.slice(1).toLowerCase())
                .join(' ');
              
              degreeSubjects.push({
                code: entityId.substring(0, 8), // Use first part of entity_id as code
                name: subjectName
              });
            }
          }
        }
      });
      
      // Add degree subjects to items array
      degreeSubjects.forEach(subject => {
        items.push({
          fieldName: 'Degree subject',
          code: subject.code,
          label: subject.name,
          academicYear: '25/26',
          status: 'no-change'
        });
      });
      
      // Remove any degree subjects with "removed" status
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].fieldName === 'Degree subject' && items[i].status === 'removed') {
          items.splice(i, 1);
        }
      }
    } catch (error) {
      // Error handling without console.error
    }
    
    // If request has selectedCategories filter
    if (req.selectedCategories && Array.isArray(req.selectedCategories) && req.selectedCategories.length) {
      items = items.filter(i => req.selectedCategories.includes(i.fieldName));
    }
    // Group items by field name
    const categorizedItems = {};
    const categorySummary = [];
    
    items.forEach(item => {
      if (!categorizedItems[item.fieldName]) {
        categorizedItems[item.fieldName] = [];
      }
      categorizedItems[item.fieldName].push(item);
    });
    
    // Helper to create a unique, Excel-safe worksheet name
    const getUniqueSheet = (name) => {
      // Remove invalid Excel sheet name characters : \ / ? * [ ]
      const invalidRegex = /[:\\/?*[\]]/g;
      let baseName = name.replace(invalidRegex, '-').trim();
      if (baseName.length === 0) {
        baseName = 'Sheet';
      }
      let base = baseName.substring(0, 31);
      let candidate = base;
      let counter = 1;
      while (workbook.getWorksheet(candidate)) {
        const suffix = ` (${counter++})`;
        const allowed = 31 - suffix.length;
        candidate = base.substring(0, allowed) + suffix;
      }
      return workbook.addWorksheet(candidate);
    };

    // Determine which categories need a worksheet – selected ones (if set) or all present ones
    const categoriesList = (req.selectedCategories && req.selectedCategories.length)
      ? req.selectedCategories
      : Object.keys(categorizedItems);

    // Create a worksheet for each category (even if it ends up empty)
    categoriesList.forEach(category => {
      const categoryItems = categorizedItems[category] || [];

      // Ensure we have a unique sheet per category respecting Excel's 31-char limit
      const sheet = workbook.getWorksheet(category) || getUniqueSheet(category);
      
      // Define columns
      sheet.columns = [
        { header: 'Code', key: 'code', width: 15 },
        { header: 'Label', key: 'label', width: 40 },
        { header: 'Academic Year', key: 'academicYear', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
      ];
      
      // Style the header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      
      // Add all data rows to the worksheet (including 'removed')
      categoryItems.forEach(item => {
        sheet.addRow({
          code: item.code,
          label: item.label,
          academicYear: item.academicYear,
          status: item.status
        });
      });
      
      // Calculate summary statistics
      const totalCount = categoryItems.length;
      const newCount = categoryItems.filter(item => item.status === 'new').length;
      const noChangeCount = categoryItems.filter(item => item.status === 'no-change').length;
      const removedCount = categoryItems.filter(item => item.status === 'removed').length;
      
      // Add to summary data
      categorySummary.push({
        category,
        count: totalCount,
        new: newCount,
        noChange: noChangeCount,
        removed: removedCount
      });
    });
    
    // Add summary data to summary sheet
    categorySummary.forEach(summary => {
      summarySheet.addRow(summary);
    });
    
    // Add total row to summary
    const totalRow = {
      category: 'TOTAL',
      count: categorySummary.reduce((sum, item) => sum + item.count, 0),
      new: categorySummary.reduce((sum, item) => sum + item.new, 0),
      noChange: categorySummary.reduce((sum, item) => sum + item.noChange, 0),
      removed: categorySummary.reduce((sum, item) => sum + item.removed, 0)
    };
    
    summarySheet.addRow(totalRow);
    const totalRowIndex = categorySummary.length + 2;
    summarySheet.getRow(totalRowIndex).font = { bold: true };
    
    // Save a copy to the filesystem inside data/Reference Data Directory
    try {
      const saveDir = path.join(process.cwd(), 'data', 'Reference Data Directory');
      // Ensure directory exists
      fs.mkdirSync(saveDir, { recursive: true });
      const savePath = path.join(saveDir, 'reference-data-25-26.xlsx');
      await workbook.xlsx.writeFile(savePath);
    } catch(saveErr) {
      // Non-fatal – log but continue with download
    }
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reference-data-directory.xlsx');
    
    // Write the workbook to the response and end the stream
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    // Log error details to the response for debugging
    return res.status(500).render('error', {
      message: 'Error generating Excel export: ' + error.message,
      error: { status: 500, stack: error.stack }
    });
  }
};

// Export all controller functions
// Export category selection page
exports.exportDirectorySelect = (req, res) => {
  try {
    const categories = new Set();
    // Derive categories from HESA_MAPPING
    Object.values(HESA_MAPPING).forEach(v => {
      categories.add(v.split(',')[0].trim());
    });
    // Add extra static categories
    ['Nationality', 'Training Route', 'Degree subject'].forEach(c => categories.add(c));

    res.render('reference-data/export-select', {
      pageTitle: 'Select categories to export',
      categories: Array.from(categories).sort(),
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (err) {
    return res.status(500).render('error', { message: 'Error loading categories', error: err });
  }
};

// Confirmation page with warning panel showing record counts
exports.exportDirectoryConfirm = (req, res) => {
  const selected = req.body.categories;
  const categories = Array.isArray(selected) ? selected : (selected ? [selected] : []);
  if (categories.length === 0) {
    req.flash('warning', 'Select at least one category');
    return res.redirect('/reference-data/export-directory/select');
  }

  // Helper: find alignment code by field name
  const getAlignmentByField = (field) => {
    return Object.entries(HESA_MAPPING).find(([, names]) => {
      return names.split(',').map(s => s.trim().toLowerCase()).includes(field.toLowerCase());
    })?.[0];
  };

  const stats = categories.map(cat => {
    // Special cases that need custom logic to keep figures in sync with the directory page

    // 1. Nationality – treat every CSV row as "no-change"
    if (cat === 'Nationality') {
      try {
        const rows = getRowsFromExcelSheet('NATION');
        const count = rows.length;
        return { category: cat, new: 0, noChange: count, removed: 0, total: count };
      } catch (e) {
        return { category: cat, new: 0, noChange: 0, removed: 0, total: 0 };
      }
    }

    // 2. Degree subject – derive subjects from markdown register file (same logic as directory())
    if (cat === 'Degree subject') {
      try {
        const registerPath = path.join(process.cwd(), 'data', 'data gem', 'register_degree_subhject.md');
        const content = fs.readFileSync(registerPath, 'utf8');
        const lines = content.split('\n');
        let subjectCount = 0;
        lines.forEach(l => {
          if (l.includes('::DegreeSubjects::') && l.includes('entity_id')) subjectCount += 1;
        });
        return { category: cat, new: 0, noChange: subjectCount, removed: 0, total: subjectCount };
      } catch (e) {
        return { category: cat, new: 0, noChange: 0, removed: 0, total: 0 };
      }
    }

    // 3. Training Route – adjust counts for specific codes 13/14 as per directory rules
    if (cat === 'Training Route') {
      try {
        const diff = compareSingleAlignment('ENTRYRTE');
        let newCnt = diff.onlyGem.length;
        let removedCnt = diff.onlyCsv.length;
        let noChangeCnt = diff.aligned.length;

        // Move aligned code 13 (Provider-led salaried (postgraduate)) from no-change to removed
        diff.aligned.forEach(r => {
          const label = r.gemLabel || r.csvLabel;
          if (r.code === '13' && label === 'Provider-led salaried (postgraduate)') {
            removedCnt += 1;
            noChangeCnt -= 1;
          }
        });

        // Move CSV-only code 14 (Teacher Degree Apprenticeship) from removed to new
        diff.onlyCsv.forEach(r => {
          if (r.code === '14' && r.label === 'Teacher Degree Apprenticeship') {
            newCnt += 1;
            removedCnt -= 1;
          }
        });

        return { category: cat, new: newCnt, noChange: noChangeCnt, removed: removedCnt, total: newCnt + noChangeCnt + removedCnt };
      } catch (e) {
        return { category: cat, new: 0, noChange: 0, removed: 0, total: 0 };
      }
    }

    // Default behaviour for all other categories
    const code = getAlignmentByField(cat);
    if (!code) {
      return { category: cat, new: 0, noChange: 0, removed: 0, total: 0 };
    }
    try {
      const diff = compareSingleAlignment(code);
      const newCnt = diff.onlyGem.length;
      const removedCnt = diff.onlyCsv.length;
      const noChangeCnt = diff.aligned.length;
      return {
        category: cat,
        new: newCnt,
        noChange: noChangeCnt,
        removed: removedCnt,
        total: newCnt + noChangeCnt + removedCnt
      };
    } catch (e) {
      return { category: cat, new: 0, noChange: 0, removed: 0, total: 0 };
    }
  });

  res.render('reference-data/export-confirm', {
    pageTitle: 'Confirm export categories',
    categories,
    stats,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
};

// Ready confirmation page before download
exports.exportDirectoryReady = (req, res) => {
  const chosen = req.body.categories;
  const categories = Array.isArray(chosen) ? chosen : (chosen ? [chosen] : []);
  if (categories.length === 0) {
    req.flash('warning', 'Select at least one category');
    return res.redirect('/reference-data/export-directory/select');
  }
  res.render('reference-data/export-ready', {
    pageTitle: 'Export ready',
    categories,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
};

// Alias of exportDirectory for clarity in routes
exports.exportDirectoryDownload = async (req, res) => {
  // If called via POST from confirm page filter by chosen categories
  const chosen = req.body.categories;
  const selected = Array.isArray(chosen) ? chosen : (chosen ? [chosen] : []);
  if (selected.length) {
    req.selectedCategories = selected; // pass to exportDirectory via request
  }
  return exports.exportDirectory(req, res);
};

module.exports = exports;
