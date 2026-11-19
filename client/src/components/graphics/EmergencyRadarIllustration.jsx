import React from 'react';
import radarVideo from './SHAP_Radar.mp4';

export const EmergencyRadarIllustration = ({ hospitalCount = 4, statusText = "Broadcasting..." }) => {
  return (
    <div className="relative w-full aspect-video mx-auto flex items-center justify-center my-2 overflow-hidden rounded-xl">
      <video
        src={radarVideo}
        autoPlay
        loop
        muted
        playsInline
        aria-label="Emergency broadcast radar animation"
        className="block w-full h-full object-cover"
      />
    </div>
  );
};
export default EmergencyRadarIllustration;

