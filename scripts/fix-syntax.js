const fs = require('fs');

['Matomo ecomm Web/app.js', 'demo/infinity-shop/app.js', 'app.js'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/payBtnText && \(payBtnText\.style\.display = 'none';/g, "if (payBtnText) payBtnText.style.display = 'none';");
  c = c.replace(/payBtnText && \(payBtnText\.style\.display = 'inline';/g, "if (payBtnText) payBtnText.style.display = 'inline';");
  c = c.replace(/confirmedGiftSection && \(confirmedGiftSection\.style\.display = 'block';/g, "if (confirmedGiftSection) confirmedGiftSection.style.display = 'block';");
  c = c.replace(/confirmedGiftSection && \(confirmedGiftSection\.style\.display = 'none';/g, "if (confirmedGiftSection) confirmedGiftSection.style.display = 'none';");
  c = c.replace(/confirmedGiftSection && \(confirmedGiftSection\.style\.display\s*=\s*'block';/g, "if (confirmedGiftSection) confirmedGiftSection.style.display = 'block';");
  c = c.replace(/confirmedGiftSection && \(confirmedGiftSection\.style\.display\s*=\s*'none';/g, "if (confirmedGiftSection) confirmedGiftSection.style.display = 'none';");
  fs.writeFileSync(f, c, 'utf8');
});
console.log('Fixed syntax in all app.js files.');
