### outdated
# Stat structure
Type:
 - Value
 - Effect
Name
Modification instructions (increase/decrease if value, when (and how long, if not permanent) to apply effect if effect)
Outcome:
 - Dynamic (one prompt for all values / if effect is active, the rest is determined by the model)
 - Fixed prompts depending on the value (if type is value) [low priority]
If value:
 - Range (min/max)
 - Default
If effect:
 Timed:
  - turns (number)
  - determined by LLM