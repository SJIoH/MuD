exports.listeners = {
	combat: function (l10n)
	{
		return function (player, room, players, npcs, callback)
		{
			initiate_combat(l10n, this, player, room, npcs, callback);
		}
	}
};

function initiate_combat (l10n, npc, player, room, npcs, callback)
{
	player.setInCombat(true);
	npc.setInCombat(true);

	player.sayL10n(l10n, 'ATTACK', npc.getShortDesc(player.getLocale()));

	// Get the weapon speed or just use a standard 1 sec counter
	var player_speed = player.getAttackSpeed();
	// Same for npcs
	var npc_speed    = npc.getAttackSpeed();

	var weapon = player.getEquipped('wield', true);

	var npc_timer = setInterval(function ()
	{
		var player_health  = player.getAttribute('health');
		var damage = npc.getDamage();
		damage = Math.min(player_health, damage.min + Math.max(0, Math.floor(Math.random() * (damage.max - damage.min))));

		if (!damage) {
			if (weapon) {
				weapon.emit('parry', player);
			}
			player.sayL10n(l10n, 'NPC_MISS', npc.getShortDesc(player.getLocale()), damage)
		} else {
			player.sayL10n(l10n, 'DAMAGE_TAKEN', npc.getShortDesc(player.getLocale()), damage)
		}

		player.setAttribute('health', player_health - damage);
		if (player_health <= damage) {
			player.setAttribute('health', 1);
			return combat_end(false);
		}

		player.combatPrompt({
			target_name: npc.getShortDesc(player.getLocale()),
			target_max_health: npc.getAttribute('max_health'),
			target_health: npc.getAttribute('health'),
		});
	}, npc_speed);

	var player_timer = setInterval(function ()
	{
		var npc_health = npc.getAttribute('health');
		var damage = player.getDamage();
		damage = Math.min(npc_health, damage.min + Math.max(0, Math.floor(Math.random() * (damage.max - damage.min))));

		if (!damage) {
			if (weapon) {
				weapon.emit('miss', player);
			}
			player.sayL10n(l10n, 'PLAYER_MISS', npc.getShortDesc(player.getLocale()), damage)
		} else {
			if (weapon) {
				weapon.emit('hit', player);
			}
			player.sayL10n(l10n, 'DAMAGE_DONE', npc.getShortDesc(player.getLocale()), damage)
		}

		npc.setAttribute('health', npc_health - damage);
		if (npc_health <= damage) {
			return combat_end(true);
		}

		player.combatPrompt({
			target_name: npc.getShortDesc(player.getLocale()),
			target_max_health: npc.getAttribute('max_health'),
			target_health: npc.getAttribute('health'),
		});
	}, player_speed);

	function combat_end (success)
	{
		player.setInCombat(false);
		npc.setInCombat(false);
		if (success) {
			player.emit('regen');
			room.removeNpc(npc.getUuid());
			npcs.destroy(npc);
			player.sayL10n(l10n, 'WIN', npc.getShortDesc(player.getLocale()));
		} else {
			player.sayL10n(l10n, 'LOSE', npc.getShortDesc(player.getLocale()));
			player.die();
			npc.setAttribute('health', npc.getAttribute('max_health'));
		}
		clearInterval(npc_timer);
		clearInterval(player_timer);
		player.prompt();
		callback(success);
	}
}
