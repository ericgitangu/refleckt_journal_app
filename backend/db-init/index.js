const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Initialize AWS clients
const dynamoDB = new AWS.DynamoDB();
const secretsManager = new AWS.SecretsManager();
const rdsDataService = new AWS.RDSDataService();

// Get environment variables
const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'reflekt/db-credentials';
const DB_CLUSTER_ARN = process.env.DB_CLUSTER_ARN;
const DB_NAME = process.env.DB_NAME || 'reflekt';

exports.handler = async function(event, context) {
  console.log('Starting database initialization...');
  
  try {
    // Create DynamoDB tables
    await createDynamoDBTables();
    
    // Initialize PostgreSQL schema
    await initializePostgreSQLSchema();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Database initialization complete',
      }),
    };
  } catch (error) {
    console.error('Error initializing database:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Database initialization failed',
        error: error.message,
      }),
    };
  }
};

async function createDynamoDBTables() {
  console.log('Creating DynamoDB tables...');
  
  // Define DynamoDB tables
  const tables = [
    {
      TableName: 'reflekt-entries',
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' },
        { AttributeName: 'tenant_id', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'tenant_id', AttributeType: 'S' },
        { AttributeName: 'user_id', AttributeType: 'S' },
        { AttributeName: 'created_at', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UserIndex',
          KeySchema: [
            { AttributeName: 'tenant_id', KeyType: 'HASH' },
            { AttributeName: 'user_id', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
        {
          IndexName: 'DateIndex',
          KeySchema: [
            { AttributeName: 'user_id', KeyType: 'HASH' },
            { AttributeName: 'created_at', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      TableName: 'reflekt-categories',
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' },
        { AttributeName: 'tenant_id', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'tenant_id', AttributeType: 'S' },
        { AttributeName: 'user_id', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UserIndex',
          KeySchema: [
            { AttributeName: 'tenant_id', KeyType: 'HASH' },
            { AttributeName: 'user_id', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      TableName: 'reflekt-insights',
      KeySchema: [
        { AttributeName: 'entry_id', KeyType: 'HASH' },
        { AttributeName: 'tenant_id', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'entry_id', AttributeType: 'S' },
        { AttributeName: 'tenant_id', AttributeType: 'S' },
        { AttributeName: 'user_id', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UserIndex',
          KeySchema: [
            { AttributeName: 'tenant_id', KeyType: 'HASH' },
            { AttributeName: 'user_id', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      TableName: 'reflekt-settings',
      KeySchema: [
        { AttributeName: 'tenant_id', KeyType: 'HASH' },
        { AttributeName: 'user_id', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'tenant_id', AttributeType: 'S' },
        { AttributeName: 'user_id', AttributeType: 'S' },
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
  ];
  
  // Create each table
  for (const tableDefinition of tables) {
    try {
      console.log(`Creating table: ${tableDefinition.TableName}`);
      await dynamoDB.createTable(tableDefinition).promise();
      console.log(`Created table: ${tableDefinition.TableName}`);
    } catch (error) {
      if (error.code === 'ResourceInUseException') {
        console.log(`Table already exists: ${tableDefinition.TableName}`);
      } else {
        throw error;
      }
    }
  }
}

async function initializePostgreSQLSchema() {
  if (!DB_CLUSTER_ARN) {
    console.log('No DB_CLUSTER_ARN provided, skipping PostgreSQL initialization');
    return;
  }
  
  console.log('Initializing PostgreSQL schema...');
  
  // Get database credentials from Secrets Manager
  const secretResponse = await secretsManager.getSecretValue({
    SecretId: DB_SECRET_NAME,
  }).promise();
  
  const secretString = secretResponse.SecretString;
  const { username, password } = JSON.parse(secretString);
  
  // Read schema SQL
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Execute SQL script
  await rdsDataService.executeStatement({
    resourceArn: DB_CLUSTER_ARN,
    secretArn: DB_SECRET_NAME,
    database: DB_NAME,
    sql: schemaSql,
  }).promise();
  
  console.log('PostgreSQL schema initialized');
}
