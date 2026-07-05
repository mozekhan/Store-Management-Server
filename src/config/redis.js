const Redis = require('ioredis');
const { Queue } = require('bullmq');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.queues = {};
  }

  async connect() {
    if (this.isConnected) {
      return this.client;
    }

    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      // Wait for connection
      await new Promise((resolve, reject) => {
        this.client.once('ready', resolve);
        this.client.once('error', reject);
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
      });

      // Initialize queues
      this.initializeQueues();

      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  initializeQueues() {
    const queueNames = ['receipt-generation', 'daily-reports', 'stock-alerts', 'audit-cleanup'];
    
    queueNames.forEach(name => {
      this.queues[name] = new Queue(name, {
        connection: this.client,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 1000 }
        }
      });
    });

    logger.info('BullMQ queues initialized');
  }

  async scheduleJobs() {
    try {
      // Daily report at 23:59
      await this.queues['daily-reports'].add('daily-report', {
        date: new Date()
      }, {
        repeat: {
          pattern: '59 23 * * *'
        }
      });

      // Stock alert check at 09:00
      await this.queues['stock-alerts'].add('stock-check', {
        storeId: null
      }, {
        repeat: {
          pattern: '0 9 * * *'
        }
      });

      // Audit cleanup monthly
      await this.queues['audit-cleanup'].add('audit-cleanup', {
        retentionDays: 730
      }, {
        repeat: {
          pattern: '0 0 1 * *'
        }
      });

      logger.info('Scheduled jobs configured successfully');
    } catch (error) {
      logger.error('Failed to schedule jobs:', error);
    }
  }

  async addToQueue(queueName, jobName, data, options = {}) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await this.queues[queueName].add(jobName, data, options);
  }

  async getQueueMetrics(queueName) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const queue = this.queues[queueName];
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }

  async clearQueue(queueName) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await this.queues[queueName].obliterate({ force: true });
    logger.info(`Queue ${queueName} cleared`);
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  getClient() {
    return this.client;
  }

  getQueue(queueName) {
    return this.queues[queueName];
  }
}

module.exports = new RedisClient();