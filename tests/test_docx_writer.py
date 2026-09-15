import os

code = """const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const jsContent = fs.readFileSync('js/word-export.js', 'utf-8');
const b64Match = jsContent.match(/const TEMPLATE_BASE64 = \\"([^\\"]+)\\";/);
if (!b64Match) {
    console.error('Could not find base64');
    process.exit(1);
}

const b64 = b64Match[1];
const buffer = Buffer.from(b64, 'base64');
const zip = new PizZip(buffer);

try {
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });
    
    doc.render({
        company_name: 'Test',
        reportYear: '2026',
        tbl_317: [{ipcc: '1', name: 'A', gas: 'B', u_ad: '1', ref: 'R'}],
        tbl_318: [{ipcc: '1', name: 'A', gas: 'B', u_ef: '1', ref: 'R'}],
        scope1_stationary: [],
        scope1_mobile: [],
        scope2_grid: [],
        uncertainty_pct: '0'
    });
    console.log('Render successful!');
} catch (e) {
    console.error('Error rendering');
    console.error(e.message);
    if (e.properties && e.properties.errors) {
        console.error(e.properties.errors.map(err => err.message).join('\\n'));
    }
}
"""

with open('test_docx2.js', 'w', encoding='utf-8') as f:
    f.write(code)
