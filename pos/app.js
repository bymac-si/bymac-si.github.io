fetch('https://script.google.com/macros/s/AKfycbzXVOyaP01RJychikKUxxVbdbsSXHMDf_q3WE4jTw5obWbfyrfImYGJVzxv0iFIKwKh/exec')
  .then(response => response.json())
  .then(data => {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  })
  .catch(error => console.error('Error:', error));
