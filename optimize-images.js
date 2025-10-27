#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'public', 'images');
const OUTPUT_DIR = path.join(IMAGES_DIR, 'optimized');
const BACKUP_DIR = path.join(IMAGES_DIR, 'backup');

// Configuration
const OPTIMIZATION_CONFIG = {
  wedding: { maxWidth: 1920, quality: 75 },
  team: { maxWidth: 1200, quality: 75 },
  gallery: { maxWidth: 1600, quality: 75 },
  hero: { maxWidth: 1920, quality: 80 },
  default: { maxWidth: 1920, quality: 75 }
};

// Stats tracking
const stats = {
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  originalSize: 0,
  optimizedSize: 0,
  files: []
};

/**
 * Get optimization config based on filename
 */
function getConfig(filename) {
  if (filename.includes('wedding')) return OPTIMIZATION_CONFIG.wedding;
  if (filename.includes('team') || filename.includes('tamirat') || filename.includes('tigist')) {
    return OPTIMIZATION_CONFIG.team;
  }
  if (filename.includes('hero') || filename.includes('sensitive')) return OPTIMIZATION_CONFIG.hero;
  if (filename.includes('show') || filename.includes('gallery')) return OPTIMIZATION_CONFIG.gallery;
  return OPTIMIZATION_CONFIG.default;
}

/**
 * Format file size for display
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  [OUTPUT_DIR, BACKUP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
}

/**
 * Optimize a single image
 */
async function optimizeImage(filename) {
  const inputPath = path.join(IMAGES_DIR, filename);
  const outputFilename = filename.replace(/\.[^.]+$/, '.jpg');
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  try {
    const config = getConfig(filename);
    const ext = path.extname(filename).toLowerCase();

    // Skip if not an image
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      stats.skipped++;
      return;
    }

    // Get original file size
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;
    stats.originalSize += originalSize;

    // Optimize image
    let pipeline = sharp(inputPath);

    // Resize if needed
    if (config.maxWidth) {
      const metadata = await pipeline.metadata();
      if (metadata.width > config.maxWidth) {
        pipeline = pipeline.resize(config.maxWidth, undefined, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }
    }

    // Convert to JPEG and optimize
    await pipeline
      .jpeg({
        quality: config.quality,
        progressive: true,
        mozjpeg: true
      })
      .toFile(outputPath);

    // Get optimized file size
    const optimizedStats = fs.statSync(outputPath);
    const optimizedSize = optimizedStats.size;
    stats.optimizedSize += optimizedSize;

    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    stats.files.push({
      filename,
      original: originalSize,
      optimized: optimizedSize,
      savings: parseFloat(savings)
    });

    console.log(`✓ ${filename}`);
    console.log(`  ${formatSize(originalSize)} → ${formatSize(optimizedSize)} (${savings}% smaller)`);

    stats.processed++;
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error.message);
    stats.errors++;
  }
}

/**
 * Process all images in directory
 */
async function optimizeAllImages() {
  console.log('\n═══════════════════════════════════════');
  console.log('  Image Optimization Tool');
  console.log('═══════════════════════════════════════\n');

  ensureDirectories();

  const files = fs.readdirSync(IMAGES_DIR).filter(f => {
    return fs.statSync(path.join(IMAGES_DIR, f)).isFile();
  });

  stats.total = files.length;

  console.log(`Found ${files.length} files to process...\n`);

  for (const file of files) {
    await optimizeImage(file);
  }

  // Print summary
  console.log('\n═══════════════════════════════════════');
  console.log('  Optimization Summary');
  console.log('═══════════════════════════════════════\n');

  console.log(`Total Files Scanned:    ${stats.total}`);
  console.log(`Files Processed:        ${stats.processed}`);
  console.log(`Files Skipped:          ${stats.skipped}`);
  console.log(`Errors:                 ${stats.errors}`);

  if (stats.processed > 0) {
    console.log('\nSize Reduction:');
    console.log(`  Original Total:       ${formatSize(stats.originalSize)}`);
    console.log(`  Optimized Total:      ${formatSize(stats.optimizedSize)}`);
    console.log(`  Total Saved:          ${formatSize(stats.originalSize - stats.optimizedSize)}`);
    const totalSavings = ((1 - stats.optimizedSize / stats.originalSize) * 100).toFixed(1);
    console.log(`  Overall Reduction:    ${totalSavings}%`);

    console.log('\nTop Savings:');
    const topSavings = stats.files
      .sort((a, b) => (b.original - b.optimized) - (a.original - a.optimized))
      .slice(0, 5);

    topSavings.forEach(file => {
      const saved = formatSize(file.original - file.optimized);
      console.log(`  ${file.filename}: ${saved} (${file.savings}%)`);
    });

    console.log('\n✓ Optimized images saved to:', OUTPUT_DIR);
    console.log('\nNext Steps:');
    console.log('1. Review optimized images in ' + OUTPUT_DIR);
    console.log('2. Replace original files: cp public/images/optimized/* public/images/');
    console.log('3. Clean up backup: rm -rf public/images/backup');
    console.log('4. Commit changes and deploy');
  }

  console.log('\n═══════════════════════════════════════\n');
}

// Run optimization
if (require.main === module) {
  optimizeAllImages().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { optimizeImage, optimizeAllImages };
