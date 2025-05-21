import { NextRequest, NextResponse } from 'next/server';
import { addClient, removeClient } from '../utils/events';

export async function GET(request: NextRequest) {
  const clientId = Math.random().toString(36).substring(2, 15);

  const stream = new ReadableStream({
    start(controller) {
      addClient(clientId, controller);
      controller.enqueue(`data: ${JSON.stringify({ type: 'connection', message: 'Bağlantı kuruldu' })}\n\n`);
    },
    cancel() {
      removeClient(clientId);
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
