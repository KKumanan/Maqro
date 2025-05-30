import React from 'react';
import { Macro } from '../macro_recommender';

interface MacroListProps {
  macros: Macro[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const MacroList: React.FC<MacroListProps> = ({ macros, onApprove, onReject }) => {
  return (
    <div>
      <h2>Suggested Macros</h2>
      {macros.length === 0 ? (
        <p>No macros suggested yet.</p>
      ) : (
        <ul>
          {macros.map((macro) => (
            <li key={macro.id}>
              <h3>{macro.title}</h3>
              <p>{macro.description}</p>
              <button onClick={() => onApprove(macro.id)}>Approve</button>
              <button onClick={() => onReject(macro.id)}>Reject</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MacroList; 