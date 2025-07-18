const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
dotenv.config();

const canvaService = require('./src/services/canvaService');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const orderedSigns = [
  'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
  'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'
];
const templateIds = [
  'EAGtUY5UqvY', 'EAGteElF23I', 'EAGteEpJf-k', 'EAGteTqYqwc'
]

const weekRange = "JULY 21-31";
const title = "*SPECIAL EXTENDED READING";
const content = "PREPARE FOR FORTUNATE SHIFT";
const subtitle = "+ Turbocharged New “Super” Moon Activates";

async function generateThumbnail(sign) {
  try {
    const validToken = await canvaService.ensureValidAccessToken();
    // const dataSet = await canvaService.getBrandTemplateDataset(process.env.CANVA_TEMPLATE_ID, validToken);
    const autofillJob = await canvaService.createDesignFromTemplate(validToken, templateIds[0], sign, weekRange, title, content, subtitle);

    // console.log(dataSet);
    console.log(autofillJob);
    await delay(3000);
    const jobData = await canvaService.getDesignFromAutofillJobId(validToken, autofillJob.id);
    console.log(jobData);
    const exportRes = await canvaService.createDesignExportJob(validToken, jobData.result.design.id);
    console.log(exportRes);
    await delay(3000);
    const designData = await canvaService.getDesignExportFromJobId(validToken, exportRes.id);
    console.log(designData);
    downloadUrl = designData.urls[0];
    console.log(downloadUrl);
    const imgRes = await axios.get(downloadUrl, { responseType: 'stream' });
    const outputPath = path.resolve(`./thumbnail-${sign}.png`);
    const writer = fs.createWriteStream(outputPath);
    imgRes.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}



// Run the test
console.log('Starting Generation...');
async function generateAllThumbnails() {
  for (const sign of orderedSigns) {
    console.log(`🚀 Starting generation for: ${sign}`);
    await generateThumbnail(sign);
    // await delay(2000); // optional pause between signs
  }

  console.log('🎉 All thumbnails generated!');
}

generateAllThumbnails()
  .then(() => console.log('Generation completed'))
  .catch(error => console.error('Generation error:', error)); 
