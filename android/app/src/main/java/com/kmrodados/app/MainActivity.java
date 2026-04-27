package com.kmrodados.app;

import android.os.Bundle;
import android.view.View;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);

        View conteudo = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(conteudo, (view, insets) -> {
            Insets barras_sistema = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(barras_sistema.left, barras_sistema.top, barras_sistema.right, barras_sistema.bottom);
            return insets;
        });
    }
}
