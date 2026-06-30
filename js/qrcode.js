document.addEventListener("DOMContentLoaded", function () {
  const qrcodeCanvas = document.getElementById("qrcodeCanvas");
  const qrcodeElement = document.getElementById("qrcode");

  const entries = JSON.parse(localStorage.getItem("entries")) || [];
  const patientName = localStorage.getItem("patientFullName");
  const fileContent = generateHistoryContentQrcode(entries, patientName);

  // Échapper les balises HTML dans le contenu du QR code
  const escapedFileContent = escapeHtml(fileContent);

  const qr = new QRious({
    element: qrcodeCanvas,
    value: escapedFileContent,
    size: 128,
    foreground: "#299272",
  });

  qr.toDataURL(function (dataURL) {
    const image = new Image();
    image.src = dataURL;
    qrcodeCanvas.parentNode.replaceChild(image, qrcodeCanvas);
  });

  const qrCode = new QRCode(qrcodeElement, {
    text: escapedFileContent,
    width: 150,
    height: 150,
  });

  displayPatientMoods();
});

// Fonction pour générer le contenu de l'historique pour le QR code
function generateHistoryContentQrcode(entries, patientName) {
  let fileContent = "Date\tHumeur\tNom du patient\n";

  entries.forEach((entry) => {
    fileContent += `${entry.date}\t${entry.mood}\t${patientName}\n`;
  });

  return fileContent;
}

// Fonction pour échapper les balises HTML
function escapeHtml(text) {
  const element = document.createElement("div");
  element.textContent = text;
  return element.innerHTML;
}

// Récupérer les informations d'humeur des patients et afficher la liste
function displayPatientMoods() {
  const patientListElement = document.getElementById("patientList");
  patientListElement.innerHTML = ""; // Vider la liste

  // Récupérer les données des patients du stockage local
  const patientData = localStorage.getItem("patientData");
  if (patientData) {
    const patients = JSON.parse(patientData);

    if (patients.length > 0) {
      patients.forEach(function (patient) {
        const listItem = document.createElement("li");

        const dateElement = document.createElement("p");
        dateElement.textContent = `Date: ${patient.date}`;

        const moodElement = document.createElement("p");
        moodElement.textContent = `Humeur: ${patient.mood}`;

        const fullNameElement = document.createElement("p");
        fullNameElement.textContent = `Nom: ${patient.fullName}`;

        listItem.appendChild(dateElement);
        listItem.appendChild(moodElement);
        listItem.appendChild(fullNameElement);

        patientListElement.appendChild(listItem);
      });
    } else {
      const listItem = document.createElement("li");
      listItem.textContent = "Aucune information d'humeur disponible.";
      patientListElement.appendChild(listItem);
    }
  } else {
    const listItem = document.createElement("li");
    listItem.textContent = "Aucune information d'humeur disponible.";
    patientListElement.appendChild(listItem);
  }
}
