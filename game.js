(function (Phaser) {

	var game = new Phaser.Game(
		//The width and height of the game in pixels
		1200, 600,
		//Type of graphic rendering to use (Auto tells Phaser to detect if WebGL is supported.  If not, it will default to Canvas)
		Phaser.Auto,
		//The parent element of the game, referenced in the html page
		'phaser',
		{
			preload: preload, // The preloading function, will run 1 time
			create: create, // The creation function, will run 1 time
			update: update // The update (game-loop) function, will run entire life of the game
		}	
	);

	var player; // The player-controller sprite
	var facing = 'right'; // Which direction the character is facing (default is 'left')
	var hozMove = 160; // The amount to move horizontally 
	var vertMove = -200; // The amount to move vertically (when 'jumping')
	var jumpTimer = 0;  // The initial value of the timer
	var map;
	var layer;
	var mummy;
	var walk;
	var move;
	var spacefield;
	var platforms;
	var logo;
	var score = 0;
	var scoreText;

	function preload(){
		// Load the spritesheet assets. In ex. 'character.png', telling Phaser each frame is 40x64
		// Load mummy 37x45 with 18 frames
		game.load.spritesheet('mummy', 'assets/metalslug_mummy37x45.png', 37, 45, 18);

		// Load Logo
		game.load.image('FSA', 'assets/fullstackLogo.png');

		// Load background
		game.load.image('starfield', 'assets/background.png');

		//Load Ledge
		game.load.image('ledge', 'assets/tile-floor.png')

		// Load tilemap and image.  It follows the Tilemap.TILE_JSON format that Phaser knows.  Uses Tiled to create this file.
		// Cache-key 'map' and 'level'.
		game.load.tilemap('map', 'assets/map.json', null, Phaser.Tilemap.TILED_JSON);
		game.load.image('level', 'assets/level.png');
	}


	function create() {
		// Make the background, this is the world of the game
    	spacefield = game.add.tileSprite(100,395,1500,900,'starfield');

		// Start the physics system ARCADE, this will give us basic velocity and speed.
		game.physics.startSystem(Phaser.Physics.ARCADE);

		// Load tilemap
		map = game.add.tilemap('map'); // 'map' needs to match the Tilemap cache-key
		map.addTilesetImage('level'); // 'level' needs to match the Image cache-key
		map.setCollisionBetween(1, 5); // Setting collission for cell number 1 to cell number 5
		layer = map.createLayer('Tile Layer 1'); // Create layer based on map.json on assets folder.  It will look into file 'layers.name = Tile Layer 1'
		layer.resizeWorld(); // resize entire world to match the size of the tile map(originally 500x500)

		//Create and add a sprite to the game at the position (7*64 x 13*64) and using spritesheet 'character'
		player = game.add.sprite(200, 900, 'mummy');
		player.smoothed = false;
		// Scale the sprite;
		player.scale.set(2);

		//walk animations, no other parameters so it will use the available frames in the sprite sheet
		walk = player.animations.add('walk');

		// start the animation by using its key ('walk').  30 is the frame rate and true means it will loop when it finishes
		move = player.animations.play('walk', 30, true);
		player.anchor.setTo(.2,.2);
		move.enableUpdate = true;



		// Add Logo and scale Logo
		logo = game.add.group();
		logo.enableBody = true;
		//set up timer to load the logo and call createLogo function
		game.time.events.repeat(Phaser.Timer.SECOND * 2, 100, createLogo, this);

		//set score for the game
		scoreText = game.add.text(300, 100, 'Score: 0', {fontSize: '32px', fill: '#000'});
		//fixed text to camera
		scoreText.fixedToCamera = true;


		//	By default, sprits do not have a physics 'body'
		//	Before we can adjust its physics properties, need to add a 'body' by enabling
		//	Can take a second argument to specify the type of physics system to use but will be default to ARCADE system since 
		//	we started with in on line 36
        game.physics.enable(player);

		//	We want the player to collide with the bounds of the world, not exceed the edges of the world --Does not needed since tilemap has been implemented
		// player.body.collideWorldBounds = true;

		// Set the amount of gravity to apply to the physics body of the 'player' sprite pos ;Y will push down the sprite
		player.body.gravity.y = 250;

		// Set the camera to follow the 'player'.  game camera will only see 500x500 if this is not included.
		game.camera.follow(player);

	}

	function createLogo(){
		for(var i = 0; i < 10; i++){
			var star = logo.create(Math.random()*i*500, 0, 'FSA');
			star.scale.setTo(.2,.2);
			// add gravity
			star.body.gravity.y = 100;

			// add random bounce value
			star.body.bounce.y = 0.7 + Math.random() * 0.2;
		}
	}	

	function update(){
		//check if a player overlaps with the logo
		game.physics.arcade.overlap(player, logo, collectStar, null, this);

		function collectStar (player, star) {
			//removes star from screen
			star.kill();

			// Add and update the score
			score += 10;
			scoreText.text = 'Score: ' + score;
		}


		// Set image to scroll
		spacefield.tilePosition.x += .2;

		// Player-layer collission. Allows sprite to collide with the game layer;  Sprite will fall through.  Returns a boolean value
		game.physics.arcade.collide(player, layer);
		game.physics.arcade.collide(player, logo);

		// Reset the x (horizontal) velocity every update so player movement is not getting compounded
		player.body.velocity.x = 0;

		// Check if the left arrow key is being pressed
		if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT)){
			// Set the 'player' sprite's x velocity to a negative number:
			// have it move left on the screen.
			player.body.velocity.x = -hozMove;

			// Check if 'facing' is not 'left' then set it to 'left'
			if (facing !== 'left'){
				facing = 'left';
				player.scale.x *= -1;
			}
			// Check if the right arrow key is being pressed
		} else if(game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)){
			// Set the 'player' sprite's x velocity to a positive number:
			// have it move right on the screen.
			player.body.velocity.x = hozMove;

			// Check if 'facing' is not 'right'
			if (facing !== 'right'){
				facing = 'right';
				player.scale.x *= -1;
			}
		}

		// Check if the jumpButton (UP) is down AND if the 'player' physics body is onFloor (touching a tile)
		// AND if the current game.time is greater than the value 'jumpTimer'
		// We need to make sure the player cannot jump while already in the air AND that jumping takes place while the sprite
		// is colliding with a tile in order to jump off it.
		if (game.input.keyboard.isDown(Phaser.Keyboard.UP) && player.body.onFloor() && game.time.now > jumpTimer){
			// Set the 'player' sprite;s y velocity to a negative number (vertMove is -90) and thus it moves up on the screen.
			player.body.velocity.y = vertMove;

			//Add 650 and the current time together and set that value to 'jumpTimer'
			//The 'jumpTimer' is how long in milliseconds between jumps.  Here it will be 650 ms
			jumpTimer = game.time.now + 625;
		}

		// Check if 'facing' is 'left'.  referecing the spritesheet.
		if (facing === 'left'){
			// Set the 'player' to the second (1) frame ('facing' is 'left')
			player.frame = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];		
		} else if (facing === 'right'){
			// Set the 'player' to the first (0) frame ('facing' is 'right').	
			player.frame = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
		}

	}

}(Phaser));