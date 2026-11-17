# Typomaniac

Typomaniac est un jeu de frappe en duel 1v1 classé. On peut y jouer sans s'identifier ; s'identifier permet de garder ses résultats. Ce glossaire fixe le vocabulaire de l'identité, puis celui de la frappe : ce qu'un joueur tape, comment c'est jugé et ce qu'on en mesure.

## Language

### Identité

**Joueur** :
Personne identifiée, dont les résultats sont conservés et lui restent rattachés d'une visite à l'autre. Un Joueur sans **Pseudo** est identifié mais ne peut encore rien enregistrer ni apparaître publiquement.
_Avoid_ : Utilisateur, compte, membre

**Pseudo** :
Nom public d'un **Joueur**, qu'il choisit lui-même et peut changer quand il veut. Deux Joueurs ne peuvent pas porter le même, même en changeant la casse.
_Avoid_ : Username, nom d'utilisateur, identifiant, surnom

**Invité** :
Personne qui joue sans s'être identifiée ; rien n'est conservé pour elle.
_Avoid_ : Anonyme, visiteur, utilisateur non connecté

### Partie

**Partie** (`Game`) :
Session de frappe d'un seul joueur, de sa première lettre à son Résultat.
_Avoid_ : test (réservé aux tests automatisés), manche, run

**Résultat** (`Result`) :
Ce qu'une Partie terminée produit : sa durée et les mesures de la frappe du joueur.
_Avoid_ : score, points

**Mode** :
Ce qui décide de la fin d'une Partie : `time` pour une durée fixe, `words` pour un nombre fixe de mots.

**Mot cible** :
Mot que le joueur doit taper, Séparateur compris.
_Avoid_ : mot attendu, mot à taper

**Séparateur** :
Espace qui termine un Mot cible et qui se tape comme une lettre.
_Avoid_ : espace de fin, délimiteur

### Événements

**Événement** (`GameEvent`) :
Ce qu'on applique à une Partie pour la faire avancer : une action du joueur ou un signal de temps.
_Avoid_ : action, message

**Frappe** (`Keystroke`) :
Insertion d'un caractère par le joueur, jugée correcte ou incorrecte.
_Avoid_ : saisie, keystroke

**Appui** (`KeyPress`) :
Geste physique du joueur sur une touche du clavier, du moment où il l'enfonce à celui où il la relâche. À la différence d'une Frappe, il n'écrit rien et n'est pas jugé : il décrit le rythme de la frappe, pas son contenu.
_Avoid_ : pression, keypress, Frappe

**Départ** :
Événement qui fait partir l'horloge d'une Partie à un signal commun, au lieu de la première Frappe du joueur.
_Avoid_ : top, go, lancement

**Tic** :
Événement de minuterie qui indique à une Partie que le temps a passé.
_Avoid_ : tick, battement

### Mesures

**WPM** :
Vitesse du joueur en mots par minute, comptée sur les seuls mots tapés exactement ; un mot vaut 5 caractères.
_Avoid_ : vitesse nette, mots/min

**WPM brut** :
Vitesse du joueur en mots par minute, comptée sur tout ce qu'il a tapé, fautes comprises.
_Avoid_ : raw, vitesse brute

**Précision** :
Part des Frappes correctes sur l'ensemble des Frappes, en pourcentage ; une faute corrigée reste une faute.
_Avoid_ : exactitude, accuracy

**Constance** :
Régularité de la vitesse du joueur au fil de la Partie, en pourcentage.
_Avoid_ : consistance, régularité, consistency

**Constance des touches** :
Régularité du temps qui sépare les Appuis successifs du joueur, en pourcentage.
_Avoid_ : constance des Frappes, key consistency

**Inactivité** :
Temps d'une Partie pendant lequel le joueur ne tape pas.
_Avoid_ : AFK, pause
