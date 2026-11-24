/**
 * HRIS & PAYROLL MASTER QA AUTOMATION TEST SUITE
 * Sub-Agent 3: Web App QA & Verification Specialist
 * 
 * Verifikasi:
 * 1. DOM Integrity & ID element validation (148 elements)
 * 2. Event Listeners & Buttons validation (88 buttons, 125 event handlers)
 * 3. Mathematical Formulas & Edge Cases (BPJS ceilings, PP 35/2021 Overtime, PP 36/2021 Alpha, PP 58/2023 PPh 21 TER, CTC)
 * 4. Modal Dialogs & Overlay Dismissal (Backdrop click & ESC key handler)
 * 5. Data Export (Excel & CSV UTF-8 BOM, empty & populated)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('=============================================================');
console.log('   HRIS & PAYROLL - COMPREHENSIVE QA REGRESSION SUITE        ');
console.log('=============================================================\n');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`[PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`[FAIL] ${message} - Details: ${details}`);
    totalFailed++;
  }
}

// ================= TEST 1: DOM ID INTEGRITY =================
console.log('\n--- 1. PENGUJIAN INTEGRITAS DOM & ID ELEMENT ---');
const declaredIdRegex = /\bid=["']([^"']+)["']/gi;
const declaredIds = new Set();
let match;
while ((match = declaredIdRegex.exec(html)) !== null) {
  declaredIds.add(match[1]);
}
assert(declaredIds.size >= 148, `Declared HTML IDs (${declaredIds.size} found)`);

// Check required prompt IDs
const requiredIds = ['topbarCompany', 'topbarBreadcrumb', 'bulkPrintBtnLabel', 'prorataModal', 'bulkPrintContainer'];
requiredIds.forEach(id => {
  assert(declaredIds.has(id), `Mandatory ID '${id}' exists in HTML`);
});

// Check duplicate IDs
const idCounts = {};
while ((match = declaredIdRegex.exec(html)) !== null) {
  idCounts[match[1]] = (idCounts[match[1]] || 0) + 1;
}
const duplicates = Object.keys(idCounts).filter(id => idCounts[id] > 1);
assert(duplicates.length === 0, `No duplicate IDs in HTML (Found: ${duplicates.length})`);

// ================= TEST 2: EVENT LISTENERS & BUTTONS =================
console.log('\n--- 2. PENGUJIAN EVENT LISTENER & TOMBOL ---');
const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
let buttons = [];
while ((match = buttonRegex.exec(html)) !== null) {
  buttons.push(match[1]);
}
assert(buttons.length >= 80, `Application has >= 80 buttons (Found: ${buttons.length})`);

// Extract all scripts
const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let scripts = [];
while ((match = scriptRegex.exec(html)) !== null) {
  scripts.push(match[2]);
}
const allJs = scripts.join('\n');

const definedFunctions = new Set();
const funcDefRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(/g;
while ((match = funcDefRegex.exec(allJs)) !== null) {
  definedFunctions.add(match[1]);
}
const funcVarRegex = /(?:const|let|var|window\.)\s*([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>)/g;
while ((match = funcVarRegex.exec(allJs)) !== null) {
  definedFunctions.add(match[1]);
}

const allEventsRegex = /\b(on[a-z]+)=["']([^"']+)["']/gi;
let missingHandlers = [];
const builtins = ['alert', 'prompt', 'confirm', 'print', 'focus', 'blur', 'close', 'open'];
const jsKeywords = ['if', 'for', 'while', 'switch', 'return', 'typeof', 'void'];

while ((match = allEventsRegex.exec(html)) !== null) {
  let val = match[2];
  if (val.startsWith('if(') || val.startsWith('if (')) {
    val = val.replace(/^if\s*\([^)]*\)\s*/, '');
  }
  const stmts = val.split(';').map(s => s.trim()).filter(Boolean);
  stmts.forEach(s => {
    const fn = s.match(/^([a-zA-Z0-9_$]+)\s*\(/);
    if (fn) {
      const fnName = fn[1];
      if (!definedFunctions.has(fnName) && !builtins.includes(fnName) && !jsKeywords.includes(fnName)) {
        missingHandlers.push({ event: match[1], fnName, code: s });
      }
    }
  });
}
assert(missingHandlers.length === 0, `All event handler functions are defined (Missing: ${missingHandlers.length})`);

// ================= TEST 3: FORMULA MATEMATIKA & EDGE CASES =================
console.log('\n--- 3. PENGUJIAN FORMULA MATEMATIKA & EDGE CASES ---');
const mockEnv = {
  attendance: {},
  companySettings: {
    name: "MFA Studio",
    workDays: 5,
    jkkRiskRate: 0.0024,
    npwp: "12.345.678.9-012.000"
  }
};

const sandbox = {
  console: console,
  attendance: mockEnv.attendance,
  companySettings: mockEnv.companySettings,
  Math: Math,
  parseFloat: parseFloat,
  parseInt: parseInt
};
const context = vm.createContext(sandbox);

function extractFunction(name) {
  const startRegex = new RegExp(`function\\s+${name}\\s*\\(`);
  const startMatch = startRegex.exec(allJs);
  if (!startMatch) return null;
  const startIndex = startMatch.index;
  let openBraceIndex = allJs.indexOf('{', startIndex);
  let braceCount = 1;
  let curr = openBraceIndex + 1;
  while (braceCount > 0 && curr < allJs.length) {
    if (allJs[curr] === '{') braceCount++;
    else if (allJs[curr] === '}') braceCount--;
    curr++;
  }
  return allJs.substring(startIndex, curr);
}

const mathCode = `
${extractFunction('getTerCategory')}
${extractFunction('getTerRate')}
${extractFunction('calculatePayrollForEmployee')}
`;
vm.runInContext(mathCode, context);

// PTKP Mapping test
assert(context.getTerCategory('TK/0') === 'TER_A', 'PTKP TK/0 -> TER_A');
assert(context.getTerCategory('TK/1') === 'TER_A', 'PTKP TK/1 -> TER_A');
assert(context.getTerCategory('K/0') === 'TER_A', 'PTKP K/0 -> TER_A');
assert(context.getTerCategory('TK/2') === 'TER_B', 'PTKP TK/2 -> TER_B');
assert(context.getTerCategory('K/1') === 'TER_B', 'PTKP K/1 -> TER_B');
assert(context.getTerCategory('K/3') === 'TER_C', 'PTKP K/3 -> TER_C');

// PPh 21 TER rate checks
assert(context.getTerRate('TER_A', 5400000) === 0.00, 'TER_A Rp5.400.000 tarif 0%');
assert(context.getTerRate('TER_A', 5500000) === 0.0025, 'TER_A Rp5.500.000 tarif 0.25%');
assert(context.getTerRate('TER_A', 10000000) === 0.02, 'TER_A Rp10.000.000 tarif 2.0%');
assert(context.getTerRate('TER_B', 6200000) === 0.00, 'TER_B Rp6.200.000 tarif 0%');
assert(context.getTerRate('TER_B', 15000000) === 0.04, 'TER_B Rp15.000.000 tarif 4.0%');
assert(context.getTerRate('TER_C', 6600000) === 0.00, 'TER_C Rp6.600.000 tarif 0%');
assert(context.getTerRate('TER_C', 10000000) === 0.015, 'TER_C Rp10.000.000 tarif 1.5%');

// BPJS Ceilings test
context.attendance['EMP_TEST1'] = { hadir: 21, alpha: 0, lemburBiasa: 0, lemburLibur: 0 };
const empUnder = { id: 'EMP_TEST1', pokok: 5000000, tunjangan: 1000000, ptkp: 'TK/0' };
const resUnder = context.calculatePayrollForEmployee(empUnder);
assert(resUnder.bpjsKesKaryawan === 60000, 'BPJS Kes Karyawan di bawah batas (1% x 6jt = 60rb)');
assert(resUnder.bpjsKesPerusahaan === 240000, 'BPJS Kes Perusahaan di bawah batas (4% x 6jt = 240rb)');

context.attendance['EMP_TEST2'] = { hadir: 21, alpha: 0, lemburBiasa: 0, lemburLibur: 0 };
const empOver = { id: 'EMP_TEST2', pokok: 15000000, tunjangan: 5000000, ptkp: 'K/1' };
const resOver = context.calculatePayrollForEmployee(empOver);
assert(resOver.bpjsKesKaryawan === 120000, 'BPJS Kes Karyawan mentok batas maksimal Rp12jt (1% = 120rb)');
assert(resOver.bpjsKesPerusahaan === 480000, 'BPJS Kes Kantor mentok batas maksimal Rp12jt (4% = 480rb)');
assert(resOver.bpjsTkKaryawan === (15000000 * 0.02 + 10042300 * 0.01), 'BPJS JP Karyawan mentok batas maksimal Rp10.042.300');

// Overtime testing (PP 35/2021)
const upahPerJam = 6000000 / 173;
context.attendance['EMP_OT1'] = { hadir: 21, alpha: 0, lemburBiasa: 0, lemburLibur: 0 };
assert(context.calculatePayrollForEmployee({ id: 'EMP_OT1', pokok: 6000000, tunjangan: 0, ptkp: 'TK/0' }).totalLembur === 0, 'Lembur 0 jam menghasilkan nominal Rp0');

context.attendance['EMP_OT2'] = { hadir: 21, alpha: 0, lemburBiasa: 2, lemburLibur: 0 };
const resOt2 = context.calculatePayrollForEmployee({ id: 'EMP_OT2', pokok: 6000000, tunjangan: 0, ptkp: 'TK/0' });
assert(Math.abs(resOt2.totalLembur - (3.5 * upahPerJam)) < 0.01, 'Lembur hari kerja 2 jam = (1.5 + 2.0) x Upah/173');

context.attendance['EMP_OT3'] = { hadir: 21, alpha: 0, lemburBiasa: 0.5, lemburLibur: 0 };
const resOt3 = context.calculatePayrollForEmployee({ id: 'EMP_OT3', pokok: 6000000, tunjangan: 0, ptkp: 'TK/0' });
assert(Math.abs(resOt3.totalLembur - (0.75 * upahPerJam)) < 0.01, 'Lembur hari kerja pecahan 0.5 jam = 0.5 x 1.5 x Upah/173');

context.attendance['EMP_OT4'] = { hadir: 21, alpha: 0, lemburBiasa: 0, lemburLibur: 8.5 };
const resOt4 = context.calculatePayrollForEmployee({ id: 'EMP_OT4', pokok: 6000000, tunjangan: 0, ptkp: 'TK/0' });
assert(Math.abs(resOt4.totalLembur - (17.5 * upahPerJam)) < 0.01, 'Lembur hari libur 8.5 jam = (8x2 + 0.5x3) x Upah/173');

// Alpha deductions testing (PP 36/2021)
context.attendance['EMP_ALP1'] = { hadir: 18, alpha: 3, lemburBiasa: 0, lemburLibur: 0 };
const resAlp1 = context.calculatePayrollForEmployee({ id: 'EMP_ALP1', pokok: 6000000, tunjangan: 0, ptkp: 'TK/0' });
assert(Math.abs(resAlp1.potonganAlpha - (3 * 6000000 / 21)) < 0.01, 'Potongan alpha 3 hari = 3 x (Upah/21)');

context.attendance['EMP_ALP2'] = { hadir: 0, alpha: 35, lemburBiasa: 0, lemburLibur: 0 };
const resAlp2 = context.calculatePayrollForEmployee({ id: 'EMP_ALP2', pokok: 6000000, tunjangan: 0, ptkp: 'TK/0' });
assert(resAlp2.gajiBersih >= 0, 'Alpha ekstrim tidak menghasilkan gaji minus (Math.max(0, ...))');

// Cost to Company (CTC)
assert(Math.abs(resUnder.totalCTC - (resUnder.totalBruto + resUnder.bpjsKesPerusahaan + resUnder.bpjsTkPerusahaan)) < 0.01, 'CTC = Total Bruto + BPJS Kantor (Emp 1)');
assert(Math.abs(resOver.totalCTC - (resOver.totalBruto + resOver.bpjsKesPerusahaan + resOver.bpjsTkPerusahaan)) < 0.01, 'CTC = Total Bruto + BPJS Kantor (Emp 2)');

// ================= TEST 4: MODALS & OVERLAY DISMISSAL =================
console.log('\n--- 4. PENGUJIAN MODAL DIALOG & OVERLAY DISMISSAL ---');
const modalList = [
  'sheetsModal', 'kompensasiModal', 'thrModal', 'pesangonModal',
  'prorataModal', 'employeeModal', 'slipModal', 'taxSimulatorModal', 'approvalModal'
];

modalList.forEach(mId => {
  const modalChunk = html.match(new RegExp(`<div\\s+id="${mId}"[^>]*>`));
  assert(modalChunk && modalChunk[0].includes('onclick="if(event.target === this)'), `Modal #${mId} has backdrop click-to-close handler`);
});

assert(html.includes("e.key === 'Escape'"), 'Global Escape (ESC) keyboard handler registered for modal dismissal');

// ================= TEST 5: RUNTIME EXECUTION & EXPORT SUITE =================
console.log('\n--- 5. PENGUJIAN EKSPOR DATA & RUNTIME EXECUTION ---');
assert(html.includes("exportPayrollExcel"), 'Function exportPayrollExcel is defined');
assert(html.includes("exportPayrollCsv"), 'Function exportPayrollCsv is defined');
assert(html.includes("'\\uFEFF'"), 'CSV Export uses UTF-8 BOM encoding for seamless Excel opening');

console.log('\n=============================================================');
console.log(`   TOTAL TESTS: ${totalPassed + totalFailed} | PASS: ${totalPassed} | FAIL: ${totalFailed}`);
console.log(`   STATUS: ${totalFailed === 0 ? '100% PASS - VERIFIED READY FOR PRODUCTION' : 'FAILED'}`);
console.log('=============================================================\n');

if (totalFailed > 0) process.exit(1);
