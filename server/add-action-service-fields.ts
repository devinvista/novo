import { db } from './mysql-db';

async function addActionServiceFields() {
  console.log('🔧 Adding service line and service fields to actions table...');
  
  try {
    // Add service_line_id column
    await db.execute(`
      ALTER TABLE actions 
      ADD COLUMN service_line_id INT NULL,
      ADD CONSTRAINT fk_actions_service_line 
      FOREIGN KEY (service_line_id) REFERENCES service_lines(id)
    `);
    console.log('✅ Added service_line_id column with foreign key');
    
    // Add service_id column
    await db.execute(`
      ALTER TABLE actions 
      ADD COLUMN service_id INT NULL,
      ADD CONSTRAINT fk_actions_service 
      FOREIGN KEY (service_id) REFERENCES services(id)
    `);
    console.log('✅ Added service_id column with foreign key');
    
    console.log('🎉 Successfully added service fields to actions table');
    
  } catch (error: any) {
    if (error.message.includes('Duplicate column name')) {
      console.log('ℹ️ Columns already exist, skipping addition');
    } else {
      console.error('❌ Error adding service fields:', error);
      throw error;
    }
  }
}

addActionServiceFields().then(() => {
  console.log('✅ Migration complete');
}).catch(console.error);