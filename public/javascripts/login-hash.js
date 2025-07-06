// login-hash.js
// Hashes the PIN on the client before submitting the form
// Uses SHA-256 (built-in Web Crypto API)

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Attach to the login form
window.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('form');
  if (!form) return;

  // Auto-advance PIN fields
  const pinFields = [
    form.querySelector('[name="pin1"]'),
    form.querySelector('[name="pin2"]'),
    form.querySelector('[name="pin3"]'),
    form.querySelector('[name="pin4"]')
  ];
  pinFields.forEach((field, idx) => {
    field.addEventListener('input', function(e) {
      if (field.value.length === 1 && idx < pinFields.length - 1) {
        pinFields[idx + 1].focus();
      }
    });
    field.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && field.value === '' && idx > 0) {
        pinFields[idx - 1].focus();
      }
    });
  });

  form.addEventListener('submit', async function(e) {
    // Collect the PIN from the 4 fields
    const pin1 = form.querySelector('[name="pin1"]').value;
    const pin2 = form.querySelector('[name="pin2"]').value;
    const pin3 = form.querySelector('[name="pin3"]').value;
    const pin4 = form.querySelector('[name="pin4"]').value;
    const pin = `${pin1}${pin2}${pin3}${pin4}`;
    if (pin.length !== 4 || /[^0-9]/.test(pin)) {
      // Let server-side validation handle errors
      return;
    }
    e.preventDefault(); // Prevent normal submit
    const hashedPin = await hashPin(pin);
    // Remove the original fields
    form.querySelector('[name="pin1"]').value = '';
    form.querySelector('[name="pin2"]').value = '';
    form.querySelector('[name="pin3"]').value = '';
    form.querySelector('[name="pin4"]').value = '';
    // Add a hidden input with the hash
    let hashInput = form.querySelector('[name="pin"]');
    if (!hashInput) {
      hashInput = document.createElement('input');
      hashInput.type = 'hidden';
      hashInput.name = 'pin';
      form.appendChild(hashInput);
    }
    hashInput.value = hashedPin;
    form.submit();
  });
});
