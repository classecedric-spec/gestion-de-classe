
header_str = "Prénom,Nom,Le système circulatoire.,NA,A,M,Les transformations de la matière.,NA,A,M,La puberté.,NA,A,M,La reproduction sexuée et la fécondation.,NA,A,M,L'adjectif.,NA,A,M,Les verbes d'état et les verbes d'action.,NA,A,M,L'imparfait.,NA,A,M,Le passé simple : évaluation 1.,NA,A,M,Le pronom relatif.,NA,A,M,Le passé simple - Les auxiliaires.,NA,A,M,Le passé simple - Premier groupe.,NA,A,M,Le passé simple - Deuxième groupe.,NA,A,M,Le passé simple : groupe 3.,NA,A,M,Les techniques de calcul.,NA,A,M,Les quadrilatères.,NA,A,M,Le calcul du périmètre.,NA,A,M,Les additions de fractions.,NA,A,M,Les triangles.,NA,A,M,La compensation.,NA,A,M,Je fais des estimations.,NA,A,M,La soustraction écrite.,NA,A,M,Les quadrilatères.,NA,A,M,Les triangles.,NA,A,M,L'aire.,NA,A,M,Les calculs de durées.,NA,A,M"
hadrien_str = "Hadrien,Van Liefferinge,,X,,,,,X,,,,,X,,,,X,,,X,,,,,,,,X,,,X,,,,,,X,,,,X,,,,,,,,,,,,,,,X,,,,X,,,,,X,,,,X,,,X,,,,,X,,,X,,,,X,,,,X,,,X,,,,,,X,,,X,"

header = header_str.split(',')
hadrien = hadrien_str.split(',')

# Verify triangles occurrences
triangles_indices = [i for i, h in enumerate(header) if h == 'Les triangles.']
# We know the 26/03 eval is the second one (index 1 in this list)
target_eval_idx = triangles_indices[1]

print(f"Target 'Les triangles.' index: {target_eval_idx}")
print(f"Columns: {header[target_eval_idx]}, {header[target_eval_idx+1]}, {header[target_eval_idx+2]}, {header[target_eval_idx+3]}")
print(f"Values: {hadrien[target_eval_idx]}, {hadrien[target_eval_idx+1]}, {hadrien[target_eval_idx+2]}, {hadrien[target_eval_idx+3]}")
