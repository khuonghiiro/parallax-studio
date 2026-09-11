import { startApplicationService } from '../packages/application/src/index.js';

const port = Number(process.env.PARALLAX_SERVICE_PORT || 3100);

async function main(): Promise<void> {
  console.log(`[Parallax Service] Khởi động Application Service tại cổng ${port}...`);
  try {
    const instance = await startApplicationService({ port });
    console.log(
      `[Parallax Service] Đã sẵn sàng tại http://127.0.0.1:${instance.port}`,
    );

    const cleanup = async () => {
      console.log('[Parallax Service] Đang đóng service...');
      await instance.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error('[Parallax Service] Lỗi khởi động:', err);
    process.exit(1);
  }
}

main();
