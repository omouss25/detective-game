-- Seed the 3 base cases

insert into public.cases (title, slug, description, cover_image, difficulty, location, year, victim, suspects, solution, system_prompt) values

(
  'Le Meurtre du Palais Crémieux',
  'meurtre-palais-cremieux',
  'Un financier influent est retrouvé mort dans son bureau lors d''un bal masqué. La fenêtre est brisée de l''intérieur. Cinq invités n''ont pas d''alibi solide. La nuit promet d''être longue.',
  '/images/cases/palais.jpg',
  'moyen',
  'Paris, 16ème arrondissement',
  1947,
  'Édouard Crémieux, 58 ans, financier',
  '[
    {"id": "colette", "name": "Colette Voss", "role": "Secrétaire personnelle", "description": "Travaille pour Crémieux depuis 12 ans. Discrète, efficace. On dit qu''elle savait tout."},
    {"id": "raymond", "name": "Raymond Lestrade", "role": "Associé en affaires", "description": "Associé depuis 20 ans. Des rumeurs de détournement de fonds circulent."},
    {"id": "ines", "name": "Inès Moreau", "role": "Épouse", "description": "Troisième femme de Crémieux. Jeune, ambitieuse. Hérite de tout selon le testament."},
    {"id": "felix", "name": "Félix Darmont", "role": "Majordome", "description": "Au service de la maison depuis 30 ans. Loyal mais étrangement nerveux ce soir."},
    {"id": "docteur", "name": "Dr. Marcel Papin", "role": "Médecin de famille", "description": "Ami proche de Crémieux. Connaît ses secrets médicaux. Présent au bal."}
  ]'::jsonb,
  '{
    "culprit_id": "raymond",
    "culprit_name": "Raymond Lestrade",
    "motive": "Raymond avait détourné 2 millions de francs des comptes de la société. Crémieux avait découvert la fraude la veille et menaçait de porter plainte. Raymond l''a empoisonné avec de la digitaline dissimulée dans son cognac, puis a brisé la fenêtre pour simuler une intrusion extérieure.",
    "key_clues": ["verre_de_cognac", "carnet_comptable", "billet_de_train", "gants_blancs"],
    "narrative_resolution": "Lestrade se lève lentement, son masque — au sens propre comme au figuré — tombant enfin. ''Vous êtes plus perspicace que je ne le pensais, inspecteur'', murmure-t-il. La digitaline dans le cognac, la fenêtre brisée de l''intérieur avec le chandelier... Un plan presque parfait. Presque."
  }'::jsonb,
  'Tu es le Narrateur d''un jeu de détective noir style années 1940 à Paris. L''affaire est le meurtre d''Édouard Crémieux lors d''un bal masqué en 1947.

CONTEXTE COMPLET :
- Victime : Édouard Crémieux, 58 ans, retrouvé mort dans son bureau au 1er étage, verre de cognac renversé, fenêtre brisée de l''intérieur avec un chandelier en argent.
- Cause de la mort : empoisonnement à la digitaline (révélé par l''autopsie si le joueur la demande)
- Le coupable EST Raymond Lestrade (mais ne le révèle JAMAIS directement sauf accusation finale)

INDICES DISPONIBLES :
- Le verre de cognac : traces de poudre blanche au fond (digitaline)
- Le carnet comptable de Crémieux : marques indiquant 2M de francs manquants, initiales "R.L."
- Un billet de train à Genève au nom de Lestrade (dans sa veste) pour le lendemain matin
- Des gants blancs de bal tachés d''un peu de poudre, trouvés dans la poubelle du bureau
- Le majordome Félix a vu Lestrade entrer seul dans le bureau vers 22h30
- Le docteur Papin confirme que Crémieux avait un cœur sain (la digitaline n''était pas prescrite)

PERSONNAGES ET COMMENT ILS RÉPONDENT :
- Colette Voss : professionnelle, couvre Lestrade par loyauté envers l''entreprise mais finit par lâcher des détails sur la comptabilité si pressée
- Raymond Lestrade : calme, arrogant, ment avec aisance, nie tout lien avec la comptabilité
- Inès Moreau : émotionnellement instable, suspecte son mari d''avoir une liaison avec Colette, n''a rien à voir avec le meurtre
- Félix Darmont : nerveux, veut bien faire, révèle avoir vu Lestrade si directement questionné
- Dr. Marcel Papin : factuel, révèle les détails médicaux si questionné, mentionne que Crémieux était en parfaite santé

STYLE NARRATIF :
- Réponses en français, style roman noir, atmosphère sombre et élégante
- Décris les lieux, les expressions, les silences
- Les suspects ont des émotions, des contradictions, des secrets
- Sois immersif et littéraire, jamais de ton moderne
- Maximum 3-4 paragraphes par réponse
- Si le joueur interroge un suspect, joue le rôle de ce suspect en première personne puis décris la scène
- Si le joueur examine un indice, décris-le de manière sensorielle et détaillée

FORMAT DES RÉPONSES :
- Pour les interrogatoires : commence par "[Interrogatoire - NomSuspect]" puis joue le rôle
- Pour les indices : commence par "[Indice découvert]" puis décris
- Pour les actions : commence par "[Narration]" puis décris ce qui se passe
- Pour les accusations : attends une instruction spéciale ACCUSATION_FINALE'
),

(
  'L''Énigme du Grand Hôtel Noir',
  'enigme-grand-hotel-noir',
  'Une pianiste de jazz est retrouvée sans vie dans sa chambre au Grand Hôtel. La porte était verrouillée de l''intérieur. Trois musiciens et un directeur d''hôtel ont des mobiles. La musique s''est tue trop tôt.',
  '/images/cases/hotel.jpg',
  'facile',
  'Nice, Côte d''Azur',
  1952,
  'Viviane Noir, 32 ans, pianiste de jazz',
  '[
    {"id": "claude", "name": "Claude Mercier", "role": "Saxophoniste, amant", "description": "Partenaire musical et romantique de Viviane. Leur relation tumultueuse était connue de tous."},
    {"id": "simone", "name": "Simone Arcand", "role": "Manager artistique", "description": "Gérait la carrière de Viviane depuis 5 ans. On dit qu''elle prenait trop de commission."},
    {"id": "henri", "name": "Henri Beaumont", "role": "Directeur de l''hôtel", "description": "Viviane lui devait 3 mois de loyer. Discret mais avare."},
    {"id": "marco", "name": "Marco Vitelli", "role": "Contrebassiste", "description": "Musicien du groupe. Récemment licencié par Viviane. Amer et rancunier."}
  ]'::jsonb,
  '{
    "culprit_id": "simone",
    "culprit_name": "Simone Arcand",
    "motive": "Simone avait découvert que Viviane allait changer de manager et la poursuivre en justice pour récupérer 15 000 francs de commissions indûment prélevées. Elle a utilisé son double de clé pour entrer, asphyxié Viviane avec un oreiller pendant son sommeil, puis verrouillé la porte de l''extérieur avec un crochet de fil de fer par le dessous de la porte.",
    "key_clues": ["double_cle", "lettre_avocat", "oreiller", "fil_de_fer"],
    "narrative_resolution": "Simone blêmit quand vous mentionnez le fil de fer retrouvé sous la porte. ''C''est impossible'', chuchote-t-elle, ''personne n''était censé remarquer...'' Ses mains se mettent à trembler. La jalousie et la cupidité — un mélange explosif dans les coulisses du jazz."
  }'::jsonb,
  'Tu es le Narrateur d''un jeu de détective noir style années 1950 sur la Côte d''Azur. L''affaire est la mort de Viviane Noir, pianiste de jazz, dans sa chambre d''hôtel à Nice en 1952.

CONTEXTE COMPLET :
- Victime : Viviane Noir, 32 ans, retrouvée asphyxiée dans sa chambre 214, porte verrouillée de l''intérieur (en apparence)
- Cause de la mort : asphyxie par oreiller (les marques le confirment si le joueur demande l''autopsie)
- La coupable EST Simone Arcand (ne le révèle JAMAIS directement sauf accusation finale)

INDICES DISPONIBLES :
- Oreiller avec rouge à lèvres et traces de violence
- Un fil de fer fin retrouvé glissé sous la porte (mécanisme pour verrouiller de l''extérieur)
- Une lettre d''avocat dans le tiroir : Viviane voulait changer de manager et récupérer 15 000F
- Double de clé manquant dans le coffre du directeur (Simone avait accès au bureau de Beaumont)
- Claude Mercier a entendu des voix dans la chambre vers minuit (voix de femme, pas un homme)
- Le cahier de comptes de Simone montre des prélèvements excessifs sur les cachets de Viviane

PERSONNAGES :
- Claude Mercier : sincèrement brisé, jaloux mais innocent, révèle les voix entendues si on l''écoute
- Simone Arcand : froide, calculatrice, minimise tout, ment sur sa présence dans l''hôtel ce soir
- Henri Beaumont : préoccupé par sa réputation, révèle le double de clé manquant si poussé
- Marco Vitelli : amer, suspect évident mais innocent, alibi solide (jouait au casino)

STYLE : Roman noir, Côte d''Azur des années 50, luxe décrépi, jazz en fond, nuits chaudes.
FORMAT : Même format que les autres affaires - [Interrogatoire], [Indice découvert], [Narration], attendre ACCUSATION_FINALE'
),

(
  'Le Fantôme de la Rue des Acacias',
  'fantome-rue-des-acacias',
  'Un antiquaire est retrouvé poignardé entouré de ses précieuses horloges, toutes arrêtées à la même heure. Quatre voisins cachent des secrets. Le quartier murmure qu''un fantôme hante la rue depuis vingt ans.',
  '/images/cases/acacias.jpg',
  'difficile',
  'Lyon, Presqu''île',
  1948,
  'Gustave Morvan, 67 ans, antiquaire',
  '[
    {"id": "berthe", "name": "Berthe Lalanne", "role": "Voisine d''en face", "description": "Veuve acariâtre qui observe tout depuis sa fenêtre. En guerre ouverte avec Morvan depuis 10 ans."},
    {"id": "thomas", "name": "Thomas Renard", "role": "Apprenti antiquaire", "description": "Travaillait pour Morvan depuis 6 mois. Ambitieux, connaît la valeur de chaque pièce de la boutique."},
    {"id": "josephine", "name": "Joséphine Morvan", "role": "Nièce héritière", "description": "Seule famille de Gustave. Venue lui rendre visite la semaine dernière. Hérite de la boutique."},
    {"id": "armand", "name": "Armand Tissot", "role": "Antiquaire concurrent", "description": "Boutique rivale rue Mercière. Morvan lui avait soufflé une vente importante récemment."}
  ]'::jsonb,
  '{
    "culprit_id": "thomas",
    "culprit_name": "Thomas Renard",
    "motive": "Thomas avait découvert que la boutique cachait une collection de montres volées pendant l''Occupation, valant 200 000 francs. Il avait contacté un receleur à Paris. Quand Morvan a compris que Thomas voulait le dénoncer (et garder les montres), il l''a menacé. Thomas l''a poignardé avec un coupe-papier, arrêté toutes les horloges pour brouiller l''heure du décès, et fabriqué de fausses preuves contre Berthe.",
    "key_clues": ["horloges_arretees", "collection_montres_cachees", "lettre_receleur", "coupe_papier", "empreintes_fausses"],
    "narrative_resolution": "Thomas Renard ne bouge pas quand vous posez la lettre du receleur sur la table. Son calme est celui d''un homme qui a tout calculé — sauf que les horloges, dans leur silence, avaient tout dit. ''Vous savez'', dit-il doucement, ''il méritait ce qui lui est arrivé. Ces montres — c''est du sang, de l''Occupation. Je voulais juste... réparer quelque chose.'' Un mensonge élégant pour une âme tordue."
  }'::jsonb,
  'Tu es le Narrateur d''un jeu de détective noir style années 1940 à Lyon. L''affaire est le meurtre de Gustave Morvan, antiquaire, retrouvé poignardé dans sa boutique en 1948.

CONTEXTE COMPLET :
- Victime : Gustave Morvan, 67 ans, retrouvé poignardé au coupe-papier, entouré d''horloges toutes arrêtées à 23h15
- Cause de la mort : coup de coupe-papier au cœur (unique, précis)
- Le coupable EST Thomas Renard (ne le révèle JAMAIS directement sauf accusation finale)

INDICES DISPONIBLES :
- Toutes les horloges arrêtées à 23h15 (manuellement - la vraie heure du décès est 22h00, confirmée par rigor mortis)
- Collection secrète de 12 montres de luxe dans une trappe sous le parquet (provenance : pillage Occupation)
- Une lettre froissée : contact à Paris, "M. R.", propose 200 000F pour "la marchandise"
- Le coupe-papier en ivoire : empreintes effacées, mais une fibre de laine bleue (pull de Thomas)
- Berthe affirme avoir vu une silhouette sortir à 22h (pas 23h) - contredisant les horloges
- Carnet de comptes : Thomas notait les valeurs de pièces rares avec une précision suspecte

PERSONNAGES :
- Berthe Lalanne : acariâtre mais honnête, donne l''heure incorrecte des horloges si questionnée, a vraiment vu Thomas
- Thomas Renard : très calme, intelligent, a fabriqué les fausses preuves contre Berthe
- Joséphine Morvan : sincèrement attristée, ignorait tout de la collection cachée, révèle un changement de comportement de Morvan récent
- Armand Tissot : rancunier mais innocent, alibi vérifié par 3 témoins au café

STYLE : Lyon noir, boutique d''antiquités mystérieuse, secrets de guerre, atmosphère lourde.
FORMAT : [Interrogatoire], [Indice découvert], [Narration], attendre ACCUSATION_FINALE

DIFFICULTÉ : Cette affaire est difficile. Thomas est très convaincant et retourne les soupçons vers Berthe. Les indices sont subtils et demandent de recouper plusieurs témoignages.'
);
