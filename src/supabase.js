// ══════════════════════════════════════════════
// ASYSTENT DEKORACJI — Supabase client
// ══════════════════════════════════════════════

export const SB_URL = 'https://sqjetzxyfyzfjvqpldzh.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxamV0enh5Znl6Zmp2cXBsZHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTc4OTEsImV4cCI6MjA5NDA5Mzg5MX0.MVRSJW1JiE8XNBYy3OjtuvMPoJEiix9E8eJ__BsXhJ4';

function sbFetch(method, path, body) {
  return fetch(SB_URL + '/rest/v1/' + path, {
    method,
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => {
    if (!r.ok) return r.text().then(t => { throw new Error(t); });
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('json')) return r.json();
    return null;
  });
}

export const sbApi = {
  getClients:         ()                   => sbFetch('GET',    'clients?select=*&order=created_at.desc'),
  addClient:          (data)               => sbFetch('POST',   'clients', data),
  updateClient:       (id, data)           => sbFetch('PATCH',  'clients?id=eq.'+id, data),
  deleteClient:       (id)                 => sbFetch('DELETE', 'clients?id=eq.'+id),
  updateClientStatus: (id, status)         => sbFetch('PATCH',  'clients?id=eq.'+id, { status }),

  getDeals:           ()                   => sbFetch('GET',    'deals?select=*&order=created_at.desc'),
  addDeal:            (clientId)           => sbFetch('POST',   'deals', { client_id: clientId, stage: 'zapytanie' }),
  updateDeal:         (id, data)           => sbFetch('PATCH',  'deals?id=eq.'+id, data),
  deleteDeal:         (id)                 => sbFetch('DELETE', 'deals?id=eq.'+id),

  getAttachments:     (dealId)             => sbFetch('GET',    'deal_attachments?deal_id=eq.'+dealId+'&select=*'),
  addAttachment:      (dealId, url, name)  => sbFetch('POST',   'deal_attachments', { deal_id: dealId, url, name }),
  deleteAttachment:   (id)                 => sbFetch('DELETE', 'deal_attachments?id=eq.'+id),

  getOrders:          ()                   => sbFetch('GET',    'fabric_orders?select=*&order=created_at.desc'),
  addOrder:           (data)               => sbFetch('POST',   'fabric_orders', data),
  updateOrder:        (id, data)           => sbFetch('PATCH',  'fabric_orders?id=eq.'+id, data),
  deleteOrder:        (id)                 => sbFetch('DELETE', 'fabric_orders?id=eq.'+id),

  getSewing:          ()                   => sbFetch('GET',    'sewing_orders?select=*&order=created_at.desc'),
  addSewing:          (data)               => sbFetch('POST',   'sewing_orders', data),
  updateSewing:       (id, data)           => sbFetch('PATCH',  'sewing_orders?id=eq.'+id, data),
  deleteSewing:       (id)                 => sbFetch('DELETE', 'sewing_orders?id=eq.'+id),

  getTasks:           ()                   => sbFetch('GET',    'tasks?select=*&order=created_at.desc'),
  addTask:            (data)               => sbFetch('POST',   'tasks', data),
  updateTask:         (id, data)           => sbFetch('PATCH',  'tasks?id=eq.'+id, data),
  deleteTask:         (id)                 => sbFetch('DELETE', 'tasks?id=eq.'+id),
};
