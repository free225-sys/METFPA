# Suivi backend restant après application UX P0

Ce fichier trace les besoins UX qui ne peuvent pas être finalisés proprement avec les contrats actuels. Aucun de ces besoins ne bloque le cockpit Directeur ni l’espace Direction livrés dans `codex/apply-claude-ux-p0`.

## B1 — Motif structuré de correction

**État actuel :** une mission `correction_demandee` est remontée en priorité. L’interface tente d’afficher un commentaire M&E existant, sinon elle indique clairement que le motif détaillé n’est pas disponible.

**Besoin :** exposer `correction_reason`, ou garantir une entrée `mission_updates` typée « correction », avec auteur, date et motif.

## B2 — Relance partagée et suivie

**État actuel :** l’interface génère un texte de relance copiable et l’étiquette « envoi manuel · non partagé ».

**Besoin :** collection et endpoints de relance avec direction, objet, auteur, responsable, échéance, statut et historique. Le RBAC doit permettre à `coordination` et `dircab` de créer et suivre une relance, et à la direction concernée de la consulter.

## B3 — Suivi structuré par point de réunion

**État actuel :** l’ordre du jour et une note de compte rendu sont persistés dans `weekly_meetings`. Les décisions peuvent être préparées dans le registre existant.

**Besoin :** pour chaque point, stocker la décision prise, le responsable, le délai, le statut d’exécution et le report éventuel. Prévoir une vue des décisions non exécutées.

## B4 — Échéance proche distincte de l’échéance dépassée

**État actuel :** l’échéance dépassée est rouge. Les alertes élevées utilisent l’orange, sans calcul contractuel spécifique de proximité.

**Besoin :** exposer une règle déterministe `due_soon` avec horizon configurable, séparée de `overdue`.

## B5 — Motif de revue M&E

**État actuel :** les statuts de validation existants restent disponibles, mais aucun motif normalisé de file de revue n’est ajouté dans cette phase.

**Besoin :** exposer un champ `review_reason` typé : valeur manquante, écart avancement/exécution, soumission en attente, correction en cours.

## Règle de permission confirmée

- `coordination` : prépare les réunions et décisions, relance les directions, suit les mises à jour et propose des actions ;
- `dircab` : seul rôle autorisé à définir ou modifier le champ d’arbitrage final ;
- `direction_editor` : reste strictement limité à sa direction.
