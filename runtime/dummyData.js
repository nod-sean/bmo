(function (global) {
    'use strict';

    const DUMMY_CHAT_MESSAGES = [
        { senderKey: 'ui.chat.sender.system', senderFallback: 'System', textKey: 'ui.chat.dummy.welcome', textFallback: 'Server notice: Welcome commander.' },
        { senderKey: 'ui.chat.sender.world', senderFallback: 'World', textKey: 'ui.chat.dummy.dragon', textFallback: 'Dragon status: HP remaining (3/4).' },
        { senderKey: 'ui.chat.sender.guild', senderFallback: 'Guild', textKey: 'ui.chat.dummy.reset', textFallback: 'Daily mission reset in 5 minutes.' },
        { senderKey: 'ui.chat.sender.world', senderFallback: 'World', textKey: 'ui.chat.dummy.market', textFallback: 'Market notice: Gold price updated.' },
        { senderKey: 'ui.chat.sender.system', senderFallback: 'System', textKey: 'ui.chat.dummy.chest', textFallback: "User 'LegendKnight' found a chest." },
        { senderKey: 'ui.chat.sender.world', senderFallback: 'World', textKey: 'ui.chat.dummy.scout', textFallback: 'Scout report: Enemy near border.' },
        { senderKey: 'ui.chat.sender.guild', senderFallback: 'Guild', textKey: 'ui.chat.dummy.donation', textFallback: 'Reminder: Check donation board.' },
        { senderKey: 'ui.chat.sender.system', senderFallback: 'System', textKey: 'ui.chat.dummy.exp', textFallback: 'Event started: EXP +50%.' }
    ];

    global.KOVGameDummyDataModule = {
        DUMMY_CHAT_MESSAGES
    };
})(window);
