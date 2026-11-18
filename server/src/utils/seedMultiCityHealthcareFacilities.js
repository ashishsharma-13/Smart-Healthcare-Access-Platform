import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import { externalFacilityDirectoryService } from '../services/ExternalFacilityDirectoryService.js';

dotenv.config();

export const seedMultiCityHealthcareFacilities = async () => {
  const result = await externalFacilityDirectoryService.seedDefaultExternalFacilities();
  console.log(`[Multi-city directory] Seed complete. Inserted/upserted ${result.seeded || 0}; directory total ${result.existing || 0}.`);
  return result;
};

if (process.argv[1]?.endsWith('seedMultiCityHealthcareFacilities.js')) {
  try {
    await connectDB();
    await seedMultiCityHealthcareFacilities();
    await disconnectDB();
  } catch (error) {
    console.error('[Multi-city directory] Seed failed:', error);
    process.exitCode = 1;
  }
}
