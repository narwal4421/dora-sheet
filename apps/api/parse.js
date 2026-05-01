const fs = require('fs');
const data = JSON.parse(fs.readFileSync('models.json', 'utf8')).data;
const freeModels = data.filter(m => m.pricing.prompt === "0" && m.pricing.completion === "0");
console.log(freeModels.slice(0, 20).map(m => m.id));
