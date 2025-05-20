// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameUI = document.getElementById('gameUI');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const shootBtn = document.getElementById('shootBtn');
const joystick = document.getElementById('joystick');
const joystickHandle = document.getElementById('joystick-handle');

// Set canvas size to window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Reposition player if game is running
    if (gameRunning) {
        player.y = canvas.height / 2;
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game state
let gameRunning = false;
let score = 0;
let zombies = [];
let bullets = [];
let items = [];
let lastZombieTime = 0;
let zombieSpawnInterval = 2000; // 2 seconds

// Touch controls
let joystickActive = false;
let joystickStartX = 0;
let joystickStartY = 0;
let joystickX = 0;
let joystickY = 0;
const joystickRadius = 50;

// Initialize touch controls
joystick.addEventListener('touchstart', handleJoystickStart);
joystick.addEventListener('touchmove', handleJoystickMove);
joystick.addEventListener('touchend', handleJoystickEnd);
shootBtn.addEventListener('touchstart', handleShootStart);
shootBtn.addEventListener('touchend', handleShootEnd);

// Prevent touch events from causing page scroll
document.body.addEventListener('touchmove', function(e) {
    if (gameRunning) {
        e.preventDefault();
    }
}, { passive: false });

function handleJoystickStart(e) {
    const touch = e.touches[0];
    const rect = joystick.getBoundingClientRect();
    joystickStartX = rect.left + rect.width / 2;
    joystickStartY = rect.top + rect.height / 2;
    joystickActive = true;
    handleJoystickMove(e);
}

function handleJoystickMove(e) {
    if (!joystickActive) return;
    
    const touch = e.touches[0];
    joystickX = touch.clientX - joystickStartX;
    joystickY = touch.clientY - joystickStartY;
    
    // Limit joystick handle movement
    const distance = Math.sqrt(joystickX * joystickX + joystickY * joystickY);
    if (distance > joystickRadius) {
        joystickX = (joystickX / distance) * joystickRadius;
        joystickY = (joystickY / distance) * joystickRadius;
    }
    
    // Update joystick handle position
    joystickHandle.style.transform = `translate(${joystickX}px, ${joystickY}px)`;
}

function handleJoystickEnd() {
    joystickActive = false;
    joystickX = 0;
    joystickY = 0;
    joystickHandle.style.transform = 'translate(30px, 30px)';
}

function handleShootStart() {
    if (gameRunning) {
        player.shoot();
        shootInterval = setInterval(player.shoot.bind(player), 300);
    }
}

function handleShootEnd() {
    clearInterval(shootInterval);
}

// Player object
const player = {
    x: 50,
    y: canvas.height / 2,
    width: 40,
    height: 64,
    speed: 5,
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    lastShot: 0,
    shootDelay: 300, // milliseconds
    
    // Draw player (soldier)
    draw: function() {
        // Body
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(this.x + 8, this.y + 16, 24, 32);
        
        // Head
        ctx.fillStyle = '#D2B48C';
        ctx.beginPath();
        ctx.ellipse(this.x + 20, this.y + 8, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Legs
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(this.x + 8, this.y + 48, 10, 16);
        ctx.fillRect(this.x + 22, this.y + 48, 10, 16);
        
        // Gun
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x + 32, this.y + 20, 16, 4);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x + 48, this.y + 16, 24, 8);
    },
    
    // Update player position
    update: function() {
        // Movement controls
        if (joystickActive) {
            this.x += joystickX * this.speed / joystickRadius;
            this.y += joystickY * this.speed / joystickRadius;
        }
        
        // Boundary checks
        this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));
        this.y = Math.max(0, Math.min(this.y, canvas.height - this.height));
    },
    
    // Shoot bullet
    shoot: function() {
        const now = Date.now();
        if (this.ammo > 0 && now - this.lastShot > this.shootDelay) {
            this.lastShot = now;
            this.ammo--;
            bullets.push({
                x: this.x + 72,
                y: this.y + 32,
                width: 8,
                height: 4,
                speed: 12
            });
            updateUI();
        }
    },
    
    // Take damage
    takeDamage: function(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            gameOver();
        }
        updateUI();
    },
    
    // Heal player
    heal: function(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
        updateUI();
    },
    
    // Add ammo
    addAmmo: function(amount) {
        this.ammo = Math.min(this.ammo + amount, this.maxAmmo);
        updateUI();
    }
};

// Zombie object
function createZombie() {
    const size = 30 + Math.random() * 20;
    return {
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        width: size,
        height: size,
        speed: 1 + Math.random() * 2,
        health: 3,
        damage: 10,
        lastAttack: 0,
        attackDelay: 1000,
        
        // Draw zombie
        draw: function() {
            // Body
            ctx.fillStyle = '#556B2F';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Head
            ctx.fillStyle = '#8FBC8F';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width/2, this.y - 8, this.width/3, this.width/4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes (red)
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2 - 4, this.y - 12, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x + this.width/2 + 4, this.y - 12, 2, 0, Math.PI * 2);
            ctx.fill();
        },
        
        // Update zombie position
        update: function() {
            this.x -= this.speed;
            
            // Check collision with player
            if (checkCollision(this, player)) {
                const now = Date.now();
                if (now - this.lastAttack > this.attackDelay) {
                    this.lastAttack = now;
                    player.takeDamage(this.damage);
                }
            }
            
            return this.x + this.width < 0 || this.health <= 0;
        },
        
        // Take damage
        takeDamage: function(damage) {
            this.health -= damage;
            return this.health <= 0;
        }
    };
}

// Item object (health and ammo)
function createItem(x, y, type) {
    return {
        x: x,
        y: y,
        width: 16,
        height: 16,
        type: type, // 'health' or 'ammo'
        
        draw: function() {
            if (this.type === 'health') {
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.moveTo(this.x + this.width/2, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        },
        
        update: function() {
            if (checkCollision(this, player)) {
                if (this.type === 'health') {
                    player.heal(20);
                } else {
                    player.addAmmo(10);
                }
                return true;
            }
            return false;
        }
    };
}

// Collision detection
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Update UI
function updateUI() {
    document.getElementById('health').textContent = player.health;
    document.getElementById('ammo').textContent = player.ammo;
    document.getElementById('zombies').textContent = zombies.length;
    document.getElementById('score').textContent = score;
}

// Game over
function gameOver() {
    gameRunning = false;
    startScreen.style.display = 'flex';
    startScreen.innerHTML = `
        <h1>GAME OVER</h1>
        <p>Skor Akhir: ${score}</p>
        <button id="restartButton">Main Lagi</button>
    `;
    document.getElementById('restartButton').addEventListener('click', startGame);
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update player
    player.update();
    player.draw();
    
    // Spawn zombies
    const now = Date.now();
    if (now - lastZombieTime > zombieSpawnInterval) {
        lastZombieTime = now;
        zombies.push(createZombie());
        
        // Increase difficulty
        if (score > 0 && score % 10 === 0) {
            zombieSpawnInterval = Math.max(500, zombieSpawnInterval - 100);
        }
    }
    
    // Update zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        zombie.draw();
        
        if (zombie.update()) {
            if (zombie.health <= 0) {
                score++;
                
                // Random chance to drop item
                if (Math.random() < 0.2) {
                    const type = Math.random() < 0.5 ? 'health' : 'ammo';
                    items.push(createItem(zombie.x, zombie.y, type));
                }
            }
            zombies.splice(i, 1);
            updateUI();
        }
    }
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        ctx.fillStyle = '#000000';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        bullet.x += bullet.speed;
        
        // Check if bullet is out of screen
        if (bullet.x > canvas.width) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check bullet-zombie collision
        for (let j = zombies.length - 1; j >= 0; j--) {
            if (checkCollision(bullet, zombies[j])) {
                if (zombies[j].takeDamage(1)) {
                    score++;
                    
                    // Random chance to drop item
                    if (Math.random() < 0.2) {
                        const type = Math.random() < 0.5 ? 'health' : 'ammo';
                        items.push(createItem(zombies[j].x, zombies[j].y, type));
                    }
                }
                bullets.splice(i, 1);
                updateUI();
                break;
            }
        }
    }
    
    // Update items
    for (let i = items.length - 1; i >= 0; i--) {
        items[i].draw();
        if (items[i].update()) {
            items.splice(i, 1);
        }
    }
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    // Reset game state
    gameRunning = true;
    score = 0;
    zombies = [];
    bullets = [];
    items = [];
    player.health = player.maxHealth;
    player.ammo = player.maxAmmo;
    player.x = 50;
    player.y = canvas.height / 2;
    lastZombieTime = Date.now();
    zombieSpawnInterval = 2000;
    
    // Hide start screen
    startScreen.style.display = 'none';
    
    // Update UI
    updateUI();
    
    // Start game loop
    gameLoop();
}

// Initialize game
startButton.addEventListener('click', startGame);
startScreen.style.display = 'flex';
gameUI.style.display = 'block';
