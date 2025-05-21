// SSE (Server-Sent Events) için gerekli yapılar
let clients: { id: string; controller: ReadableStreamController<any> }[] = [];

/**
 * SSE istemcilerine bildirim gönderir
 */
export function notifyClients(data: any) {
  const eventData = `data: ${JSON.stringify(data)}\n\n`;
  
  // Tüm bağlı istemcilere veriyi gönder
  clients.forEach(client => {
    try {
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(eventData);
      client.controller.enqueue(encodedData);
    } catch (error) {
      console.error(`İstemciye bildirim gönderilirken hata: ${error}`);
      // Hata durumunda istemciyi listeden kaldır
      clients = clients.filter(c => c.id !== client.id);
    }
  });
}

/**
 * Yeni SSE istemcisini ekler
 */
export function addClient(id: string, controller: ReadableStreamController<any>) {
  clients.push({ id, controller });
}

/**
 * Belirli bir istemciyi kaldırır
 */
export function removeClient(id: string) {
  clients = clients.filter(client => client.id !== id);
} 