// utils/events.ts

type Client = {
  id: string;
  controller: ReadableStreamDefaultController;
};

let clients: Client[] = [];

/**
 * Yeni SSE istemcisini ekler
 */
export function addClient(id: string, controller: ReadableStreamDefaultController) {
  clients.push({ id, controller });
}

/**
 * Belirli bir istemciyi kaldırır
 */
export function removeClient(id: string) {
  clients = clients.filter(client => client.id !== id);
}

/**
 * SSE istemcilerine bildirim gönderir
 */
function notifyClients(data: any) {
  const eventData = `data: ${JSON.stringify(data)}\n\n`;

  clients.forEach(client => {
    try {
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(eventData);
      client.controller.enqueue(encodedData);
    } catch (error) {
      console.error(`İstemciye bildirim gönderilirken hata: ${error}`);
      // Hata varsa istemciyi listeden kaldır
      clients = clients.filter(c => c.id !== client.id);
    }
  });
}
