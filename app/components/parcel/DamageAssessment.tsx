import { useState } from "react";
import { AlertTriangle, Check, X, FileText, Droplets, Package, Edit, Circle, Unlock, HelpCircle } from "lucide-react";

interface DamageAssessmentProps {
  aiSuggestions: {
    tags: Array<{
      type: string;
      confidence: number;
      area: string;
    }>;
    overallConfidence: number;
    flaggedForReview: boolean;
  };
  onConfirm: (assessment: {
    finalDamageAssessment: "none" | "minor" | "major";
    damageNotes?: string;
    confirmedDamageTags?: string[];
  }) => void;
  onCancel: () => void;
}

const DAMAGE_TYPES = [
  { id: "dent", label: "Dent", icon: <Circle className="w-4 h-4" /> },
  { id: "tear", label: "Tear", icon: <FileText className="w-4 h-4" /> },
  { id: "wet", label: "Water Damage", icon: <Droplets className="w-4 h-4" /> },
  { id: "crushed_corner", label: "Crushed Corner", icon: <Package className="w-4 h-4" /> },
  { id: "scratches", label: "Scratches", icon: <Edit className="w-4 h-4" /> },
  { id: "stains", label: "Stains", icon: <Circle className="w-4 h-4 fill-current" /> },
  { id: "broken_seal", label: "Broken Seal", icon: <Unlock className="w-4 h-4" /> },
  { id: "other", label: "Other", icon: <HelpCircle className="w-4 h-4" /> },
];

export default function DamageAssessment({ aiSuggestions, onConfirm, onCancel }: DamageAssessmentProps) {
  const [assessment, setAssessment] = useState<"none" | "minor" | "major">("none");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleConfirm = () => {
    onConfirm({
      finalDamageAssessment: assessment,
      damageNotes: notes.trim() || undefined,
      confirmedDamageTags: selectedTags.length > 0 ? selectedTags : undefined,
    });
  };

  const hasDamage = assessment !== "none";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Damage Assessment</h3>

      {/* AI Suggestions */}
      {aiSuggestions.tags.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-blue-600 mr-2">🤖</span>
            <span className="font-medium text-blue-900">AI Suggestions</span>
          </div>
          <div className="space-y-2">
            {aiSuggestions.tags.map((tag, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-blue-800">
                  {tag.type.replace(/_/g, ' ')} ({tag.area})
                </span>
                <span className="text-blue-600 font-medium">
                  {(tag.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-blue-600">
            Please review and confirm the actual condition below
          </div>
        </div>
      )}

      {/* Overall Assessment */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Overall Package Condition *
        </label>
        <div className="space-y-2">
          {[
            { 
              value: "none", 
              label: "No Damage", 
              description: "Package is in perfect condition",
              color: "green" 
            },
            { 
              value: "minor", 
              label: "Minor Damage", 
              description: "Superficial damage that doesn't affect contents",
              color: "yellow" 
            },
            { 
              value: "major", 
              label: "Major Damage", 
              description: "Significant damage that may affect contents",
              color: "red" 
            },
          ].map((option) => (
            <label 
              key={option.value} 
              className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                assessment === option.value 
                  ? `border-${option.color}-500 bg-${option.color}-50` 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                value={option.value}
                checked={assessment === option.value}
                onChange={(e) => setAssessment(e.target.value as any)}
                className="mt-1 mr-3"
              />
              <div>
                <div className={`font-medium ${
                  option.color === "green" ? "text-green-800" :
                  option.color === "yellow" ? "text-yellow-800" :
                  "text-red-800"
                }`}>
                  {option.label}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Damage Type Selection */}
      {hasDamage && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Damage Types (select all that apply)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DAMAGE_TYPES.map((type) => (
              <label
                key={type.id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedTags.includes(type.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTags.includes(type.id)}
                  onChange={() => handleTagToggle(type.id)}
                  className="mr-3"
                />
                <span className="mr-2">{type.icon}</span>
                <span className="text-sm font-medium">{type.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {hasDamage && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Damage Description
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the damage in detail (e.g., 'Small dent on top-left corner, approximately 2cm diameter')"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Confirm Assessment
        </button>
      </div>
    </div>
  );
}