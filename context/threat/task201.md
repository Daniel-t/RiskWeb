---
id: TASK-201
title: "ATT&CK Technique Catalog JSON (Curated Subset)"
status: done
priority: high
assigned: threat
reviewers: [analyst]
depends_on: []
modifies: shared/data/attack-catalog.json
---

# TASK-201: ATT&CK Technique Catalog JSON

## Objective
Create a curated JSON catalog of MITRE ATT&CK techniques for use in RiskWeb's control mapping system.

## Scope
Curate techniques from these tactics (most relevant to cyber risk quantification):
- **Initial Access** (TA0001) — e.g., Phishing, Exploit Public-Facing Application
- **Execution** (TA0002) — e.g., Command and Scripting Interpreter
- **Impact** (TA0040) — e.g., Data Destruction, Data Encrypted for Impact

Target: ~20-30 techniques total (quality over quantity). Include the most commonly referenced techniques that map well to defensive controls.

## Output Format
```json
{
  "version": "1.0",
  "source": "MITRE ATT&CK v15",
  "techniques": [
    {
      "id": "T1566",
      "name": "Phishing",
      "tactic": "initial-access",
      "description": "Short description...",
      "subtechniques": ["T1566.001", "T1566.002", "T1566.003"]
    }
  ]
}
```

## Requirements
- Each technique needs: id, name, tactic, short description
- Include subtechnique IDs where relevant (no need to fully expand all)
- Use kebab-case for tactic identifiers
- File location: `shared/data/attack-catalog.json`

## References
- ATT&CK Enterprise Matrix: https://attack.mitre.org/matrices/enterprise/
- TASK-205 (approved): Defines `AttackTechniqueRef` type that will consume this data
