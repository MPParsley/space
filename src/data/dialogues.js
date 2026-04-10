// Dialogue trees for each celestial body.
// Each entry: { npc, color, greeting, tree[] }
// Tree nodes: { id, text, choices: [{ text, next }] }
// next: null = end conversation, string = node id

export const DIALOGUES = {
  sun: {
    npc: 'Sol — The Sun',
    color: '#FFD700',
    greeting: 'Welcome, young explorer! I am Sol — the heart of the solar system. All planets orbit around me!',
    tree: [
      {
        id: 'root',
        text: 'What would you like to know?',
        choices: [
          { text: 'How hot are you?', next: 'temp' },
          { text: 'How big are you?', next: 'size' },
          { text: 'How old are you?', next: 'age' },
          { text: 'Goodbye, Sol!', next: null },
        ],
      },
      {
        id: 'temp',
        text: 'My surface is about 5,500 degrees! But my very centre is 15 million degrees. Very, very hot! That is why I give light and warmth to all the planets.',
        choices: [
          { text: 'That is amazing!', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'size',
        text: 'I am enormous! About 1.3 million Earths could fit inside me. All the planets in the solar system orbit around me because of my gravity.',
        choices: [
          { text: 'What is gravity?', next: 'gravity' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'gravity',
        text: 'Gravity is an invisible force that pulls things together. I am so massive that my gravity holds all eight planets in orbit around me!',
        choices: [
          { text: 'Cool! Tell me more.', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'age',
        text: 'I am about 4.6 billion years old! That is incredibly old. I will keep shining for another 5 billion years. I have plenty of time left!',
        choices: [
          { text: 'Wow! Goodbye!', next: null },
        ],
      },
    ],
  },

  mercury: {
    npc: 'Max — Mercury Station',
    color: '#C8B89A',
    greeting: "Hi there! I'm Max from Mercury Station. It gets very hot here during the day and very cold at night. Welcome!",
    tree: [
      {
        id: 'root',
        text: 'What would you like to know about Mercury?',
        choices: [
          { text: 'Why is it so hot here?', next: 'hot' },
          { text: 'How fast does Mercury orbit?', next: 'speed' },
          { text: 'What does Mercury look like?', next: 'look' },
          { text: 'Goodbye, Max!', next: null },
        ],
      },
      {
        id: 'hot',
        text: 'Mercury has almost no atmosphere! An atmosphere is like a blanket of air around a planet. Without it, the Sun heats us to 430 degrees in the day, then it drops to minus 180 degrees at night!',
        choices: [
          { text: 'What is an atmosphere?', next: 'atm' },
          { text: 'Go back', next: 'root' },
        ],
      },
      {
        id: 'atm',
        text: 'An atmosphere is a layer of gases around a planet. Earth has one — it is the air you breathe! It also traps warmth. Without one, temperatures go to extremes.',
        choices: [
          { text: 'I see! Go back', next: 'root' },
        ],
      },
      {
        id: 'speed',
        text: 'Mercury zooms around the Sun really fast! A year here — one trip around the Sun — is only 88 Earth days. That is less than 3 months on Earth!',
        choices: [
          { text: 'Wow! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'look',
        text: 'Mercury looks like the Moon! It is covered in round holes called craters, made when space rocks crashed into it billions of years ago.',
        choices: [
          { text: 'Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
    ],
  },

  venus: {
    npc: 'Vera — Venus Outpost',
    color: '#DEB887',
    greeting: "Hello! I'm Vera from Venus Outpost. Be careful — it's incredibly hot outside! Venus is the hottest planet. Welcome aboard!",
    tree: [
      {
        id: 'root',
        text: 'What do you want to know about Venus?',
        choices: [
          { text: 'Why is Venus so hot?', next: 'hot' },
          { text: 'Why does Venus spin backwards?', next: 'spin' },
          { text: 'Tell me about the clouds', next: 'clouds' },
          { text: 'Goodbye, Vera!', next: null },
        ],
      },
      {
        id: 'hot',
        text: "Venus has a very thick atmosphere full of a gas called carbon dioxide. This traps the Sun's heat like a greenhouse. The temperature is 465 degrees — hot enough to melt lead!",
        choices: [
          { text: 'What is carbon dioxide?', next: 'co2' },
          { text: 'Go back', next: 'root' },
        ],
      },
      {
        id: 'co2',
        text: 'Carbon dioxide is a gas. On Earth, it is produced when things burn or when animals breathe out. On Venus, there is so much of it that it traps all the heat. Too much CO2 causes warming!',
        choices: [
          { text: 'Good to know! Go back', next: 'root' },
        ],
      },
      {
        id: 'spin',
        text: "Most planets spin one way, but Venus spins the other way! Nobody knows exactly why. This means on Venus, the Sun rises in the west and sets in the east — the opposite of Earth!",
        choices: [
          { text: 'That\'s strange! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'clouds',
        text: 'Venus is covered in thick yellow clouds made of sulfuric acid. This is why it looks so bright in the night sky from Earth — the clouds reflect a lot of sunlight.',
        choices: [
          { text: 'Interesting! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
    ],
  },

  earth: {
    npc: 'Commander Zara — Earth Station',
    color: '#4B9CD3',
    greeting: "Welcome home, explorer! I'm Commander Zara. Earth is our home planet — the only one we know for sure has life. How can I help?",
    tree: [
      {
        id: 'root',
        text: 'What do you want to learn about Earth?',
        choices: [
          { text: 'Why does Earth have life?', next: 'life' },
          { text: 'Tell me about the oceans', next: 'ocean' },
          { text: 'What is Earth made of?', next: 'layers' },
          { text: 'Goodbye, Commander!', next: null },
        ],
      },
      {
        id: 'life',
        text: "Earth has liquid water, the right temperature, and an atmosphere with oxygen — all perfect for life! It is also just the right distance from the Sun. Scientists call this the 'Goldilocks Zone'.",
        choices: [
          { text: "What is the Goldilocks Zone?", next: 'goldilocks' },
          { text: 'Go back', next: 'root' },
        ],
      },
      {
        id: 'goldilocks',
        text: "The Goldilocks Zone is the area around a star where it is not too hot and not too cold for liquid water to exist. Just right! Like Goldilocks and the porridge.",
        choices: [
          { text: 'Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'ocean',
        text: "About 71% of Earth is covered by oceans! The Pacific Ocean alone is bigger than all the land on Earth put together. We have only explored a small part of the deep ocean.",
        choices: [
          { text: 'Amazing! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'layers',
        text: "Earth has layers like an onion! The outer crust is rock and soil. Below is the mantle of hot rock. In the middle is the core — a ball of very hot iron.",
        choices: [
          { text: 'Cool! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
    ],
  },

  moon: {
    npc: 'Luna — Lunar Base',
    color: '#CCCCCC',
    greeting: "Hello from the Moon! I'm Luna. You can see Earth right above us — isn't it beautiful? What a view!",
    tree: [
      {
        id: 'root',
        text: 'What do you want to know about the Moon?',
        choices: [
          { text: 'Have humans been here?', next: 'apollo' },
          { text: 'What causes the tides?', next: 'tides' },
          { text: 'Why do we see the Moon phases?', next: 'phases' },
          { text: 'Goodbye, Luna!', next: null },
        ],
      },
      {
        id: 'apollo',
        text: 'Yes! In 1969, astronauts Neil Armstrong and Buzz Aldrin landed on the Moon. Neil Armstrong was the first human to walk on the Moon. He said: "One small step for man, one giant leap for mankind."',
        choices: [
          { text: 'Incredible! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'tides',
        text: 'My gravity pulls on Earth\'s oceans as I orbit around Earth. This makes the water bulge, creating high and low tides. The seas rise and fall because of me!',
        choices: [
          { text: 'Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'phases',
        text: 'As I orbit Earth, you see different amounts of my lit side. When you see a full Moon, Earth is between the Sun and me. When it is a new Moon, I am between Earth and the Sun — you cannot see my lit side.',
        choices: [
          { text: 'I understand! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
    ],
  },

  mars: {
    npc: 'Marco — Mars Base Alpha',
    color: '#C1440E',
    greeting: "Howdy, explorer! I'm Marco at Mars Base Alpha. Watch out for the dust storms! Mars is exciting — it has the biggest volcano AND the longest canyon in the solar system.",
    tree: [
      {
        id: 'root',
        text: 'What do you want to know about Mars?',
        choices: [
          { text: 'Tell me about Olympus Mons', next: 'volcano' },
          { text: 'Could humans live here?', next: 'humans' },
          { text: 'Why is Mars red?', next: 'red' },
          { text: 'Goodbye, Marco!', next: null },
        ],
      },
      {
        id: 'volcano',
        text: 'Olympus Mons is the tallest volcano in the solar system — about 22 kilometres high! That is three times taller than Mount Everest on Earth. Luckily it has not erupted in millions of years.',
        choices: [
          { text: 'Wow! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'humans',
        text: 'Scientists are working on plans to send humans to Mars! It would take about 7 months to get here. The challenges are the thin atmosphere, cold temperatures, and radiation. But we are learning!',
        choices: [
          { text: 'I want to go! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'red',
        text: "Mars has lots of iron oxide in its soil — that is rust! The same stuff that makes old metal turn red-brown. The whole planet is covered in rusty red dust, giving it its famous colour.",
        choices: [
          { text: 'Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
    ],
  },

  jupiter: {
    npc: 'Captain Juno — Jupiter Station',
    color: '#C88B3A',
    greeting: "Welcome to Jupiter Station! I'm Captain Juno. Be careful out there — Jupiter's gravity is massive and its storms are enormous. The Great Red Spot alone is bigger than Earth!",
    tree: [
      {
        id: 'root',
        text: 'What do you want to learn about Jupiter?',
        choices: [
          { text: 'Tell me about the Great Red Spot', next: 'grs' },
          { text: 'How big is Jupiter?', next: 'size' },
          { text: 'Tell me about the moons', next: 'moons' },
          { text: 'Goodbye, Captain!', next: null },
        ],
      },
      {
        id: 'grs',
        text: 'The Great Red Spot is a giant storm that has been raging for at least 350 years! It is so big that Earth could fit inside it. The winds in this storm reach 640 kilometres per hour.',
        choices: [
          { text: 'That is huge! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'size',
        text: 'Jupiter is enormous! It is more than 1,300 times bigger than Earth. If Jupiter were hollow, you could fit all the other planets inside it and still have room left over.',
        choices: [
          { text: 'Amazing! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'moons',
        text: 'Jupiter has at least 95 moons! The four biggest — Io, Europa, Ganymede, and Callisto — were discovered by Galileo in 1610 using an early telescope. Europa might even have life under its ice!',
        choices: [
          { text: 'Tell me about Europa', next: 'europa' },
          { text: 'Go back', next: 'root' },
        ],
      },
      {
        id: 'europa',
        text: "Europa has a global ocean of liquid water under its icy surface. Scientists think this ocean could be home to simple life forms — making it one of the most exciting places to search for life beyond Earth!",
        choices: [
          { text: 'That is exciting! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
    ],
  },

  saturn: {
    npc: 'Sandy — Saturn Ring Station',
    color: '#EAD49A',
    greeting: "Hello traveller! I'm Sandy from Saturn Ring Station. Isn't the view spectacular? Saturn's rings are made of billions of pieces of ice and rock. Welcome!",
    tree: [
      {
        id: 'root',
        text: 'What do you want to know about Saturn?',
        choices: [
          { text: 'What are the rings made of?', next: 'rings' },
          { text: 'Tell me about Titan', next: 'titan' },
          { text: 'How many moons does Saturn have?', next: 'moons' },
          { text: 'Goodbye, Sandy!', next: null },
        ],
      },
      {
        id: 'rings',
        text: "Saturn's rings are made of billions of pieces of ice and rock, ranging from tiny grains to chunks as big as houses! They look like solid rings but they are actually made of all these separate pieces orbiting together.",
        choices: [
          { text: 'Incredible! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'titan',
        text: "Titan is Saturn's biggest moon and one of the most interesting places in the solar system. It has a thick orange atmosphere and lakes of liquid methane. It is very cold — about minus 180 degrees!",
        choices: [
          { text: 'Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'moons',
        text: "Saturn has at least 146 known moons — more than any other planet! Some are tiny rocks, while Titan is bigger than the planet Mercury. Scientists are still discovering new ones.",
        choices: [
          { text: 'Wow! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
    ],
  },

  uranus: {
    npc: 'Uma — Uranus Explorer Base',
    color: '#7FFFD4',
    greeting: "Hello! I'm Uma at Uranus Explorer Base. Uranus is very unusual — it spins on its side! That means its poles point toward the Sun instead of its equator. Dizzy!",
    tree: [
      {
        id: 'root',
        text: 'What do you want to know about Uranus?',
        choices: [
          { text: 'Why does Uranus tilt on its side?', next: 'tilt' },
          { text: 'What colour is Uranus?', next: 'colour' },
          { text: 'Tell me about Uranus\'s rings', next: 'rings' },
          { text: 'Goodbye, Uma!', next: null },
        ],
      },
      {
        id: 'tilt',
        text: "Scientists think a very large object crashed into Uranus billions of years ago, knocking it over! Uranus is tilted about 98 degrees — so it basically rolls around the Sun on its side.",
        choices: [
          { text: 'That is weird! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'colour',
        text: "Uranus is a beautiful blue-green colour because of methane gas in its atmosphere. Methane absorbs red light and reflects blue-green light. It is called an 'ice giant' because it is full of icy water, methane, and ammonia.",
        choices: [
          { text: 'Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'rings',
        text: "Uranus has 13 known rings, but they are much thinner and darker than Saturn's. They were only discovered in 1977 when Uranus passed in front of a star and the rings blocked the starlight!",
        choices: [
          { text: 'Fascinating! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
    ],
  },

  neptune: {
    npc: 'Ned — Neptune Deep Station',
    color: '#4169E1',
    greeting: "Finally, a visitor! I'm Ned at Neptune Deep Station. It is very lonely out here — we are the farthest planet from the Sun. But the view of the stars is spectacular!",
    tree: [
      {
        id: 'root',
        text: 'What do you want to know about Neptune?',
        choices: [
          { text: 'How far are we from the Sun?', next: 'distance' },
          { text: 'Tell me about the winds', next: 'winds' },
          { text: 'Tell me about Triton', next: 'triton' },
          { text: 'Goodbye, Ned!', next: null },
        ],
      },
      {
        id: 'distance',
        text: "We are about 4.5 billion kilometres from the Sun! Sunlight takes 4 hours to reach us — compared to 8 minutes for Earth. We are so far away that a year here lasts 165 Earth years.",
        choices: [
          { text: 'That is incredibly far! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'winds',
        text: "Neptune has the strongest winds in the solar system — over 2,100 kilometres per hour! That is 3 times faster than the strongest hurricane on Earth. The winds blow in the opposite direction to Neptune's rotation.",
        choices: [
          { text: 'Scary! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
      {
        id: 'triton',
        text: "Triton is Neptune's largest moon and it is very unusual — it orbits backwards! It is the only large moon in the solar system to orbit in the opposite direction to its planet's spin. It also has geysers of nitrogen ice!",
        choices: [
          { text: 'Amazing! Go back', next: 'root' },
          { text: 'Goodbye!', next: null },
        ],
      },
    ],
  },
};
