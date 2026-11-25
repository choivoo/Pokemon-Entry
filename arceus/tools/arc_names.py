# -*- coding: utf-8 -*-
"""Hisui-flavoured species roster (API ids or form slugs). Internal species id = 1-based index in this list."""
ROSTER=[722,723,724,'decidueye-hisui',155,156,157,'typhlosion-hisui',501,502,503,'samurott-hisui',
396,397,398,399,400,401,402,403,404,405,412,414,415,416,417,418,419,425,426,427,428,420,421,
265,266,267,268,269,74,75,76,95,208,41,42,169,66,67,68,77,78,37,38,58,59,'growlithe-hisui','arcanine-hisui',100,101,'voltorb-hisui','electrode-hisui',129,130,54,55,60,61,62,186,
133,134,135,136,470,25,26,172,446,143,123,900,212,
548,549,'lilligant-hisui',234,899,215,'sneasel-hisui',461,903,194,195,220,221,473,361,362,478,459,460,
131,90,91,116,117,230,118,119,170,171,211,'qwilfish-hisui',904,223,224,458,226,456,457,
109,110,92,93,94,355,356,477,200,429,479,63,64,65,79,80,199,96,97,177,178,436,437,442,
408,409,410,411,345,346,347,348,138,139,140,141,142,
443,444,445,371,372,373,147,148,149,633,634,635,704,705,'sliggoo-hisui',706,'goodra-hisui',
570,'zorua-hisui',571,'zoroark-hisui',627,628,'braviary-hisui',712,713,'avalugg-hisui',447,448,
35,36,173,39,40,174,52,53,43,44,45,182,69,70,71,102,103,114,465,111,112,464,125,466,126,467,81,82,462,
216,217,901,
480,481,482,488,491,641,642,645,905,483,484,487,493,492,127]
# evolutions that must be wired by hand (child -> parent slug/id)
EVO_FROM={900:123,899:234,903:'sneasel-hisui',904:'qwilfish-hisui',901:217,
 'arcanine-hisui':'growlithe-hisui','electrode-hisui':'voltorb-hisui','goodra-hisui':'sliggoo-hisui','sliggoo-hisui':704,'zoroark-hisui':'zorua-hisui','lilligant-hisui':548,
 'braviary-hisui':627,'avalugg-hisui':712,'decidueye-hisui':723,'typhlosion-hisui':156,'samurott-hisui':502,
 470:133,134:133,135:133,136:133}
STONE={'vaporeon':'water-stone','jolteon':'thunder-stone','flareon':'fire-stone','leafeon':'leaf-stone','raichu':'thunder-stone','ninetales':'fire-stone','arcanine':'fire-stone','arcanine-hisui':'fire-stone',
 'cloyster':'water-stone','poliwrath':'water-stone','vileplume':'leaf-stone','victreebel':'leaf-stone','exeggutor':'leaf-stone','lilligant':'leaf-stone','lilligant-hisui':'leaf-stone','clefable':'moon-stone','wigglytuff':'moon-stone'}
LEGEND={'uxie','mesprit','azelf','cresselia','darkrai','tornadus','thundurus','landorus','enamorus','dialga','palkia','giratina','arceus','shaymin'}
