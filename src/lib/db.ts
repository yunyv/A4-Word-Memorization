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
  try {
    await db.$connect()
    console.log('✅ 数据库连接成功')
    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
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