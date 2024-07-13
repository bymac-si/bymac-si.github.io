function jsonpCallback(data) {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  }
  
  function fetchData() {
    const date = document.getElementById('dateInput').value;
    const script = document.createElement('script');
    script.src = `https://script.google.com/macros/s/AKfycbzXVOyaP01RJychikKUxxVbdbsSXHMDf_q3WE4jTw5obWbfyrfImYGJVzxv0iFIKwKh/exec?callback=jsonpCallback&date=${date}`;
    document.body.appendChild(script);
  }
  