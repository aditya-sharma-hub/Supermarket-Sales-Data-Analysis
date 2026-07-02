const fs = require('fs');
const path = require('path');

const csvFilePath = path.join(__dirname, '../Supermart Grocery Sales - Retail Analytics Dataset.csv');
const outputDir = path.join(__dirname, '../public');
const outputFilePath = path.join(outputDir, 'data.json');

// Ensure public directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseDate(dateStr) {
  if (dateStr.includes('-')) {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else if (dateStr.includes('/')) {
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

try {
  const csvData = fs.readFileSync(csvFilePath, 'utf8');
  const lines = csvData.split(/\r?\n/).filter(line => line.trim().length > 0);

  const headers = parseCSVLine(lines[0]);
  
  // Map header names to indices
  const headerMap = {};
  headers.forEach((h, index) => {
    headerMap[h] = index;
  });

  const parsedData = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length < headers.length) continue;

    const orderId = cells[headerMap['Order ID']];
    const customerName = cells[headerMap['Customer Name']];
    const category = cells[headerMap['Category']];
    const subCategory = cells[headerMap['Sub Category']];
    const city = cells[headerMap['City']];
    const orderDateStr = cells[headerMap['Order Date']];
    const region = cells[headerMap['Region']];
    const sales = parseInt(cells[headerMap['Sales']], 10) || 0;
    const discount = parseFloat(cells[headerMap['Discount']]) || 0;
    const profit = parseFloat(cells[headerMap['Profit']]) || 0;
    const state = cells[headerMap['State']];
    
    // Deterministic quantity metric: quantity ranges from 1 to 9
    const quantity = (sales % 9) + 1;

    const record = {
      id: orderId,
      customer: customerName,
      category,
      subCategory,
      city,
      date: parseDate(orderDateStr),
      region,
      sales,
      discount,
      profit,
      state,
      quantity
    };

    parsedData.push(record);
  }

  fs.writeFileSync(outputFilePath, JSON.stringify(parsedData, null, 2), 'utf8');
  console.log(`Successfully parsed ${parsedData.length} records.`);
  console.log(`Output written to ${outputFilePath} (size: ${(fs.statSync(outputFilePath).size / 1024).toFixed(2)} KB)`);

} catch (error) {
  console.error('Error parsing CSV:', error);
  process.exit(1);
}
