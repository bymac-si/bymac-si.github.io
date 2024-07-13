function fetchData() {
    const date = document.getElementById('dateInput').value;
    fetch(`https://script.google.com/macros/s/AKfycbxMnY82_hfEulJWPLpggGTUbFXR4pgYaQhY-nKq2U8-gBXDHLcqhGKh1ZJKrUm5PBofQQ/exec?date=${date}`)
      .then(response => response.json())
      .then(data => {
        const appDiv = document.getElementById('app');
        if (data && data.length > 0) {
          appDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        } else {
          appDiv.innerHTML = '<p>No se encontraron registros para la fecha especificada.</p>';
        }
      })
      .catch(error => console.error('Error:', error));
  }
  