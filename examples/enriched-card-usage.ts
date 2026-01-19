import { BasecampClient } from '../src/sdk/client.js';
import { getEnrichedCard, formatEnrichedCardAsText } from '../src/sdk/resources/enrichedCards.js';

async function main() {
  const client = new BasecampClient();

  // Test with the card we know has an image
  const projectId = 44796620; // KSIĘGOWOŚĆ
  const cardId = 9304415066; // Multi-Company Accounting

  console.log('Fetching enriched card with comments and images...\n');

  const enriched = await getEnrichedCard(client, projectId, cardId);

  // Display summary
  console.log('=== ENRICHED CARD SUMMARY ===');
  console.log(`Card: ${enriched.card.title}`);
  console.log(`Project: ${enriched.card.project.name}`);
  console.log(`Column: ${enriched.card.column.name}`);
  console.log(`Steps: ${enriched.card.steps.length}`);
  console.log(`Comments: ${enriched.comments.length}`);
  console.log(`Images: ${enriched.images.length}\n`);

  // Display images
  if (enriched.images.length > 0) {
    console.log('=== IMAGES FOUND ===');
    enriched.images.forEach((img, idx) => {
      console.log(`\n${idx + 1}. ${img.metadata.filename}`);
      console.log(`   Creator: ${img.creator}`);
      console.log(`   Size: ${(img.metadata.size / 1024).toFixed(1)}KB`);
      if (img.metadata.dimensions) {
        console.log(
          `   Dimensions: ${img.metadata.dimensions.width}x${img.metadata.dimensions.height}px`
        );
      }
      console.log(`   Preview URL: ${img.url}`);
    });
    console.log('\n');
  }

  // Display formatted text version
  console.log('=== FORMATTED TEXT VERSION ===\n');
  const textVersion = formatEnrichedCardAsText(enriched);
  console.log(textVersion);

  // Display JSON structure (truncated)
  console.log('\n=== JSON STRUCTURE (first comment) ===');
  if (enriched.comments.length > 0) {
    console.log(
      JSON.stringify(
        {
          commentId: enriched.comments[0].id,
          creator: enriched.comments[0].creator.name,
          attachmentsCount: enriched.comments[0].attachments.length,
          attachments: enriched.comments[0].attachments.map(att => ({
            filename: att.filename,
            contentType: att.contentType,
            previewUrl: att.url,
          })),
        },
        null,
        2
      )
    );
  }
}

main().catch(console.error);
