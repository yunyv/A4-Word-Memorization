import { PrismaClient } from '@prisma/client'

// 扩展全局类型以包含prisma实例
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// 创建Prisma客户端实例
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })
}

// 在开发环境中避免创建多个实例
export const db = globalThis.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db
}

// 数据库连接测试函数
export async function testDatabaseConnection() {
  console.log(`[DEBUG] 开始测试数据库连接`);
  try {
    await db.$connect()
    console.log(`[DEBUG] ✅ 数据库连接成功`)
    
    // 测试基本查询
    console.log(`[DEBUG] 测试基本数据库查询`);
    const userCount = await db.user.count();
    console.log(`[DEBUG] 数据库中的用户数量: ${userCount}`);
    
    const wordCount = await db.word.count();
    console.log(`[DEBUG] 数据库中的单词数量: ${wordCount}`);
    
    return true
  } catch (error) {
    console.error(`[ERROR] ❌ 数据库连接失败:`, error)
    console.error(`[ERROR] 数据库连接错误详情:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return false
  }
}

// 优雅关闭数据库连接
export async function disconnectDatabase() {
  try {
    await db.$disconnect()
    console.log('✅ 数据库连接已关闭')
  } catch (error) {
    console.error('❌ 关闭数据库连接时出错:', error)
  }
}