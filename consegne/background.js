// Clic sull'icona: apre Giro Consegne, o torna alla scheda se è già aperta.
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('app.html');
  const [tab] = await chrome.tabs.query({ url });
  if (tab) {
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
});

// Dopo un aggiornamento dell'estensione la scheda di Cashdesk già aperta smette di essere letta:
// rimetto subito il lettore nelle schede di Cashdesk, così non serve premere F5.
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: 'https://*.app.cashdesk.nl/*' });
  for (const tab of tabs) {
    try { await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['cashdesk.js'] }); }
    catch (e) { /* scheda non raggiungibile: basterà ricaricarla */ }
  }
});
