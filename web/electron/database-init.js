const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * 数据库初始化管理器
 */
class DatabaseInitializer {
  constructor(appDataManager) {
    this.appDataManager = appDataManager;
    this.dbPath = appDataManager.getDatabasePath();
  }

  /**
   * 检查数据库是否已存在
   */
  isDatabaseExists() {
    return fs.existsSync(this.dbPath);
  }

  /**
   * 初始化数据库
   */
  async initialize() {
    const isFirstRun = !this.isDatabaseExists();

    console.log('Database path:', this.dbPath);
    console.log('Is first run:', isFirstRun);

    // 设置环境变量
    process.env.DATABASE_URL = `file:${this.dbPath}`;

    if (isFirstRun) {
      console.log('First run detected, initializing database...');
      await this.createDatabase();
      await this.seedDatabase();
    } else {
      console.log('Database already exists, checking for migrations...');
      await this.migrateDatabase();
    }

    console.log('Database initialized successfully');
  }

  /**
   * 创建数据库（运行 Prisma 迁移）
   */
  async createDatabase() {
    await this.pushDatabase();
    await this.generatePrismaClient();
  }

  /**
   * 推送数据库 schema
   */
  pushDatabase() {
    return new Promise((resolve, reject) => {
      console.log('Creating database schema...');

      const prismaPath = path.join(__dirname, '../node_modules/.bin/prisma');
      const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

      const prisma = spawn(
        process.platform === 'win32' ? 'cmd' : prismaPath,
        process.platform === 'win32'
          ? ['/c', 'prisma', 'db', 'push', '--schema', schemaPath]
          : ['db', 'push', '--schema', schemaPath],
        {
          cwd: path.join(__dirname, '..'),
          env: {
            ...process.env,
            DATABASE_URL: `file:${this.dbPath}`,
          },
          shell: process.platform === 'win32',
        }
      );

      prisma.stdout.on('data', (data) => {
        console.log(`Prisma: ${data}`);
      });

      prisma.stderr.on('data', (data) => {
        console.error(`Prisma Error: ${data}`);
      });

      prisma.on('close', (code) => {
        if (code === 0) {
          console.log('Database schema created successfully');
          resolve();
        } else {
          reject(new Error(`Prisma db push failed with code ${code}`));
        }
      });

      prisma.on('error', (error) => {
        console.error('Failed to run Prisma:', error);
        reject(error);
      });
    });
  }

  /**
   * 生成 Prisma Client
   */
  generatePrismaClient() {
    return new Promise((resolve, reject) => {
      console.log('Generating Prisma Client...');

      const prismaPath = path.join(__dirname, '../node_modules/.bin/prisma');
      const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

      const prisma = spawn(
        process.platform === 'win32' ? 'cmd' : prismaPath,
        process.platform === 'win32'
          ? ['/c', 'prisma', 'generate', '--schema', schemaPath]
          : ['generate', '--schema', schemaPath],
        {
          cwd: path.join(__dirname, '..'),
          shell: process.platform === 'win32',
        }
      );

      prisma.stdout.on('data', (data) => {
        console.log(`Prisma: ${data}`);
      });

      prisma.stderr.on('data', (data) => {
        console.error(`Prisma Error: ${data}`);
      });

      prisma.on('close', (code) => {
        if (code === 0) {
          console.log('Prisma Client generated successfully');
          resolve();
        } else {
          reject(new Error(`Prisma generate failed with code ${code}`));
        }
      });

      prisma.on('error', (error) => {
        console.error('Failed to generate Prisma Client:', error);
        reject(error);
      });
    });
  }

  /**
   * 运行数据库迁移
   */
  async migrateDatabase() {
    try {
      await this.pushDatabase();
      await this.generatePrismaClient();
    } catch (error) {
      // 迁移失败不阻塞启动
      console.warn('Database migration failed, continuing...', error);
    }
  }

  /**
   * 初始化数据（种子数据）
   */
  async seedDatabase() {
    console.log('Seeding database with initial data...');

    try {
      // 动态导入 Prisma Client
      const { PrismaClient } = require(path.join(__dirname, '../src/generated/prisma'));
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${this.dbPath}`,
          },
        },
      });

      // 创建默认租户
      const tenant = await prisma.tenant.create({
        data: {
          name: '本地用户',
          code: 'local',
          status: 'ACTIVE',
        },
      });

      console.log('Created default tenant:', tenant.id);

      // 创建默认管理员角色
      const adminRole = await prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: '管理员',
          code: 'admin',
          description: '系统管理员',
          isSystem: true,
        },
      });

      console.log('Created admin role:', adminRole.id);

      // 创建默认管理员用户
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const adminUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          username: 'admin',
          password: hashedPassword,
          email: 'admin@local.com',
          name: '管理员',
          status: 'ACTIVE',
        },
      });

      console.log('Created admin user:', adminUser.id);

      // 关联用户和角色
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });

      // 创建默认本地存储提供商
      await prisma.storageProvider.create({
        data: {
          tenantId: tenant.id,
          name: '本地存储',
          type: 'local',
          isDefault: true,
          isActive: true,
          config: {},
        },
      });

      await prisma.$disconnect();

      console.log('Database seeded successfully');
      console.log('Default admin credentials:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
    } catch (error) {
      console.error('Failed to seed database:', error);
      throw error;
    }
  }
}

module.exports = DatabaseInitializer;
