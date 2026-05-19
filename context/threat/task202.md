---
id: TASK-202
title: "D3FEND Control Mappings JSON with Effectiveness"
status: done
priority: high
assigned: threat
reviewers: [analyst]
depends_on: []
modifies: shared/data/d3fend-mappings.json
---

# TASK-202: D3FEND Control Mappings JSON

## Objective
Create a JSON mapping file that links MITRE D3FEND defensive techniques to ATT&CK techniques (from TASK-201), with suggested effectiveness distributions.

## Scope
Map D3FEND techniques to the ATT&CK subset from TASK-201. Focus on:
- Network-layer defenses (firewalls, IDS/IPS)
- Identity & access controls (MFA, PAM)
- Application security (WAF, input validation)
- Data protection (encryption, DLP)
- Detection & monitoring (SIEM, EDR)

Target: ~15-25 D3FEND techniques with mappings.

## Output Format
```json
{
  "version": "1.0",
  "source": "MITRE D3FEND v1.0",
  "defenses": [
    {
      "id": "D3-MFA",
      "name": "Multi-factor Authentication",
      "category": "preventive",
      "counters": ["T1566", "T1078"],
      "defaultEffectiveness": {
        "type": "pert",
        "min": 0.6,
        "mode": 0.85,
        "max": 0.95
      },
      "channel": "lef"
    }
  ]
}
```

## Requirements
- Each defense needs: id, name, category (preventive|detective|corrective), counters (ATT&CK IDs), defaultEffectiveness (Distribution), channel (lef|lm)
- Effectiveness distributions use PERT (preferred) or triangular — representing the fraction of risk reduced (0.0 to 1.0)
- `channel` indicates whether the control primarily reduces frequency (`lef`) or magnitude (`lm`)
- Category aligns with `ControlCategory` type from TASK-205
- File location: `shared/data/d3fend-mappings.json`

## References
- D3FEND: https://d3fend.mitre.org/
- TASK-203 (approved): Defines control effectiveness semantics (Section 2)
- TASK-205 (approved): Defines `ControlCategory`, `Distribution` types
