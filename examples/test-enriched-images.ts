import { BasecampClient } from '../src/sdk/client.js';
import { getEnrichedCard } from '../src/sdk/resources/enrichedCards.js';

async function testEnrichedWithImages() {
  try {
    const client = new BasecampClient();

    const projectId = 44796620;
    const cardId = 9304415066;

    console.log('Testing enriched card WITHOUT image download...\n');
    const withoutImages = await getEnrichedCard(client, projectId, cardId, {
      downloadImages: false,
    });

    console.log(`✓ Card: ${withoutImages.card.title}`);
    console.log(`✓ Comments: ${withoutImages.comments.length}`);
    console.log(`✓ Images found: ${withoutImages.images.length}`);

    if (withoutImages.images.length > 0) {
      const img = withoutImages.images[0];
      console.log(`\nFirst image (without download):`);
      console.log(`  Filename: ${img.metadata.filename}`);
      console.log(`  URL: ${img.url}`);
      console.log(`  Has base64: ${!!img.base64}`);
      console.log(`  MIME type: ${img.mimeType}`);
    }

    console.log('\n---\n');
    console.log('Testing enriched card WITH image download...\n');

    const withImages = await getEnrichedCard(client, projectId, cardId, { downloadImages: true });

    console.log(`✓ Card: ${withImages.card.title}`);
    console.log(`✓ Comments: ${withImages.comments.length}`);
    console.log(`✓ Images found: ${withImages.images.length}`);

    if (withImages.images.length > 0) {
      const img = withImages.images[0];
      console.log(`\nFirst image (with download):`);
      console.log(`  Filename: ${img.metadata.filename}`);
      console.log(`  URL: ${img.url}`);
      console.log(`  Has base64: ${!!img.base64}`);
      console.log(`  Base64 length: ${img.base64?.length || 0} chars`);
      console.log(`  MIME type: ${img.mimeType}`);

      if (img.base64) {
        console.log(`  First 100 chars of base64: ${img.base64.substring(0, 100)}...`);

        // Calculate approximate size
        const sizeKB = (img.base64.length * 3) / 4 / 1024;
        console.log(`  Approximate size: ${sizeKB.toFixed(2)} KB`);
      }
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEnrichedWithImages();
