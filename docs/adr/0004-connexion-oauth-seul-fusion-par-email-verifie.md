# Connexion : OAuth GitHub et Discord seulement, fusion par email vérifié, Pseudo maison

Un Invité devient Joueur en se connectant avec GitHub ou Discord, via Better Auth `1.7.25`. Il n'y a aucune autre méthode : ni email + mot de passe, ni lien magique, ni session anonyme. L'app ne stocke donc aucun mot de passe et n'envoie aucun email. Un Joueur correspond à une adresse email : deux fournisseurs qui présentent la même adresse vérifiée sont rattachés au même Joueur, sans action de sa part. Une adresse que le fournisseur ne marque pas comme vérifiée est refusée avec l'erreur `email_not_verified`, à la création d'un Joueur, au rattachement d'un fournisseur et à chaque connexion suivante. Le Pseudo est une colonne et une route de l'API, pas le plugin `username` de Better Auth.

## Considered Options

- **Email + mot de passe ou lien magique** : écartés. Il faudrait stocker des mots de passe, envoyer des emails (vérification, réinitialisation) et donc choisir un prestataire d'envoi. Les joueurs visés ont déjà un compte GitHub ou Discord.
- **Un Joueur par fournisseur, liaison à la main** : écarté. Le même Joueur se retrouverait avec deux Pseudos et deux historiques selon le bouton cliqué, et il faudrait un écran de gestion des fournisseurs liés.
- **Fusion sans exiger d'adresse vérifiée** : écartée. Il suffirait de déclarer l'adresse de quelqu'un chez un fournisseur pour entrer dans son Joueur.
- **S'en tenir au contrôle par défaut de Better Auth pour le rattachement** (sans `trustedProviders`) : écarté. Il refuse bien une adresse non vérifiée, mais avec l'erreur générique `account_not_linked`, et il laisse créer un Joueur avec une adresse non vérifiée. Le refus passe par `user.validateUserInfo`, qui couvre les trois cas avec la même erreur.
- **Plugin `username` de Better Auth pour le Pseudo** : écarté. Il sert à la connexion par pseudo + mot de passe, qu'on n'active pas, et il impose ses propres règles de format et ses routes.

## Consequences

- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DISCORD_CLIENT_ID` et `DISCORD_CLIENT_SECRET` sont obligatoires au démarrage de l'API, comme `BETTER_AUTH_SECRET` et `BETTER_AUTH_URL`.
- `account.accountLinking.trustedProviders` contient `github` et `discord`. Cette option fait rattacher un fournisseur sans regarder si l'adresse est vérifiée : elle n'est sûre que parce que `validateUserInfo` s'exécute avant le rattachement. Retirer ce contrôle en gardant l'option ouvre la prise de Joueur par adresse non vérifiée ; un test joue ce scénario de bout en bout.
- La route `/api/auth/link-social` est désactivée. Sa variante par jeton d'identité est le seul rattachement de Better Auth 1.7.25 qui ne passe pas par `validateUserInfo`. GitHub et Discord ne la proposent pas, mais un fournisseur OpenID Connect (Google, Apple) ajouté aux fournisseurs de confiance la rendrait exploitable. À revoir à chaque montée de version de Better Auth et avant d'ajouter un fournisseur.
- Un Joueur dont l'adresse n'est plus vérifiée chez le fournisseur (adresse changée, pas encore confirmée) ne peut plus se connecter par ce fournisseur tant qu'il ne l'a pas vérifiée.
- Avec `validateUserInfo`, Better Auth refuse de créer un Joueur hors d'une requête HTTP. Les tests ne peuvent donc pas passer par `internalAdapter.createUser`.
- Le flux OAuth réel (redirection, consentement, callback) ne se teste pas automatiquement : les tests remplacent les API HTTP de GitHub et Discord, le reste se recette à la main avec une OAuth App GitHub et une app Discord de dev.
- Il n'y a ni changement d'adresse ni suppression de Joueur. La suppression deviendra nécessaire avant une ouverture publique.
- Le Pseudo, ses règles et sa route sont à notre charge : format, unicité sans tenir compte de la casse, noms réservés.
