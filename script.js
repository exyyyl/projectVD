let agentsData = [];
let currentImageUrl = '';
let currentAgentName = '';
let currentAbilitiesUrls = [];
let currentTab = 'full';
window.onload = loadAgents;

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentTab = button.getAttribute('data-tab');
    const activeListItem = document.querySelector('#agentsUl li.active');
    if (activeListItem) {
      displayAgentImage(activeListItem.getAttribute('data-agent-id'));
    }
  });
});

async function loadAgents() {
  try {
    const response = await fetch('https://valorant-api.com/v1/agents');
    const data = await response.json();
    agentsData = data.data.filter(agent => agent.isPlayableCharacter);

    const agentsUl = document.getElementById('agentsUl');
    agentsData.forEach(agent => {
      const li = document.createElement('li');
      li.textContent = agent.displayName;
      li.setAttribute('data-agent-id', agent.uuid);
      li.addEventListener('click', () => {
        document.querySelectorAll('#agentsUl li').forEach(item => item.classList.remove('active'));
        li.classList.add('active');
        displayAgentImage(agent.uuid);
      });
      agentsUl.appendChild(li);
    });

    const combo = document.getElementById('agentsCombo');
    if (combo) {
      agentsData.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.uuid;
        option.textContent = agent.displayName;
        combo.appendChild(option);
      });
      combo.addEventListener('change', () => {
        const selectedId = combo.value;
        document.querySelectorAll('#agentsUl li').forEach(item => {
          if (item.getAttribute('data-agent-id') === selectedId) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
        displayAgentImage(selectedId);
      });
    }

    document.getElementById('downloadAllBtn').style.display = 'inline-block';
    document.getElementById('downloadBtn').addEventListener('click', downloadImage);
    document.getElementById('downloadAllBtn').addEventListener('click', downloadAllAgents);

  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
  }
}

function displayAgentImage(agentId) {
  const imagesContainer = document.getElementById('agentImages');
  imagesContainer.innerHTML = '';
  document.getElementById('downloadBtn').style.display = 'none';

  if (!agentId) return;

  const agent = agentsData.find(a => a.uuid === agentId);
  if (!agent) return;

  currentAgentName = agent.displayName;

  if (currentTab === 'full') {
    currentImageUrl = agent.fullPortrait;
    createAndAppendImage(currentImageUrl, currentAgentName, imagesContainer);
    document.getElementById('downloadBtn').style.display = 'inline-block';
  } else if (currentTab === 'killfeed') {
    currentImageUrl = agent.killfeedPortrait;
    createAndAppendImage(currentImageUrl, currentAgentName, imagesContainer);
    document.getElementById('downloadBtn').style.display = 'inline-block';
  } else if (currentTab === 'mini') {
    currentImageUrl = agent.displayIconSmall || agent.displayIcon;
    createAndAppendImage(currentImageUrl, currentAgentName, imagesContainer);
    document.getElementById('downloadBtn').style.display = 'inline-block';
  } else if (currentTab === 'abilities') {
    currentAbilitiesUrls = [];
    if (agent.abilities && agent.abilities.length) {
      agent.abilities.forEach((ability, index) => {
        if (ability.displayIcon) {
          currentAbilitiesUrls.push(ability.displayIcon);
          createAndAppendImage(ability.displayIcon, currentAgentName + '_ability_' + (index + 1), imagesContainer);
        }
      });
      if (currentAbilitiesUrls.length) {
        document.getElementById('downloadBtn').style.display = 'inline-block';
      }
    }
  } else if (currentTab === 'background') {
    currentImageUrl = agent.background;
    createAndAppendImage(currentImageUrl, currentAgentName + '_background', imagesContainer);
    document.getElementById('downloadBtn').style.display = 'inline-block';
  }
}

function createAndAppendImage(url, altText, container) {
  if (!url) return;
  const img = document.createElement('img');
  img.src = url;
  img.alt = altText;
  container.appendChild(img);
}

async function downloadImage() {
  if (currentTab !== 'abilities') {
    if (!currentImageUrl) return;
    try {
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentAgentName.replace(/\s+/g, '_') + '_' + currentTab + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка при скачивании изображения:', error);
    }
  } else {
    if (!currentAbilitiesUrls.length) return;
    const zip = new JSZip();
    const promises = currentAbilitiesUrls.map(async (url, index) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Ошибка загрузки иконки для ${currentAgentName} ability ${index + 1}`);
          return;
        }
        const blob = await response.blob();
        const fileName = currentAgentName.replace(/\s+/g, '_') + '_ability_' + (index + 1) + '.png';
        zip.file(fileName, blob);
      } catch (error) {
        console.error(`Ошибка при скачивании иконки для ${currentAgentName} ability ${index + 1}:`, error);
      }
    });
    await Promise.all(promises);
    zip.generateAsync({ type: 'blob' })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentAgentName.replace(/\s+/g, '_') + '_abilities.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Ошибка при создании архива с абилками:', error);
      });
  }
}

async function downloadAllAgents() {
  if (!agentsData.length) return;
  const zip = new JSZip();
  document.getElementById('downloadAllBtn').textContent = 'Скачивание...';
  const promises = agentsData.map(async agent => {
    if (currentTab === 'full' || currentTab === 'killfeed' || currentTab === 'mini' || currentTab === 'background') {
      let imageUrl = '';
      if (currentTab === 'full') imageUrl = agent.fullPortrait;
      else if (currentTab === 'killfeed') imageUrl = agent.killfeedPortrait;
      else if (currentTab === 'mini') imageUrl = agent.displayIconSmall || agent.displayIcon;
      else if (currentTab === 'background') imageUrl = agent.background;
      if (!imageUrl) return;
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.error(`Ошибка загрузки изображения для ${agent.displayName}`);
          return;
        }
        const blob = await response.blob();
        const fileName = agent.displayName.replace(/\s+/g, '_') + '_' + currentTab + '.png';
        zip.file(fileName, blob);
      } catch (error) {
        console.error(`Ошибка при скачивании изображения для ${agent.displayName}:`, error);
      }
    } else if (currentTab === 'abilities') {
      if (agent.abilities && agent.abilities.length) {
        const folder = zip.folder(agent.displayName.replace(/\s+/g, '_') + '_abilities');
        const abilityPromises = agent.abilities.map(async (ability, index) => {
          if (!ability.displayIcon) return;
          try {
            const response = await fetch(ability.displayIcon);
            if (!response.ok) {
              console.error(`Ошибка загрузки иконки для ${agent.displayName} ability ${index + 1}`);
              return;
            }
            const blob = await response.blob();
            const fileName = 'ability_' + (index + 1) + '.png';
            folder.file(fileName, blob);
          } catch (error) {
            console.error(`Ошибка при скачивании иконки для ${agent.displayName} ability ${index + 1}:`, error);
          }
        });
        await Promise.all(abilityPromises);
      }
    }
  });

  await Promise.all(promises);
  zip.generateAsync({ type: 'blob' })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'valorant_agents_' + currentTab + '.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      document.getElementById('downloadAllBtn').textContent = 'Скачать всех агентов (архив)';
    })
    .catch(error => {
      console.error('Ошибка при создании архива:', error);
      document.getElementById('downloadAllBtn').textContent = 'Скачать всех агентов (архив)';
    });
}
